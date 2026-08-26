import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=2026.08.29";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// SaaS multi-tenant: cada usuário autenticado tem um workspace isolado.
function workspaceRefFor(uid) {
  return doc(db, "users", uid, "workspaces", "principal");
}

const LAST_SYNC_KEY = "marcaflow-last-sync";
const RATE_LIMIT_MS = 30000;

async function login(email, password) {
  if (!email || !password) {
    const error = new Error("E-mail e senha são obrigatórios.");
    error.code = "auth/empty-credentials";
    throw error;
  }
  if (String(email).length < 5 || String(email).length > 254) {
    const error = new Error("E-mail inválido.");
    error.code = "auth/invalid-email";
    throw error;
  }
  if (String(password).length < 6) {
    const error = new Error("Senha deve ter pelo menos 6 caracteres.");
    error.code = "auth/wrong-password";
    throw error;
  }
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (error.code === "auth/too-many-requests") {
      const newError = new Error("Muitas tentativas. Aguarde 30 segundos e tente novamente.");
      newError.code = error.code;
      throw newError;
    }
    throw error;
  }
}

async function logout() {
  return signOut(auth);
}

async function loadWorkspace() {
  if (!auth.currentUser) return null;
  const snapshot = await getDoc(workspaceRefFor(auth.currentUser.uid));
  return snapshot.exists() ? snapshot.data().payload : null;
}

async function saveWorkspace(payload) {
  if (!auth.currentUser) return;

  const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY) || "0");
  const now = Date.now();
  if (now - lastSync < RATE_LIMIT_MS) {
    console.warn("Save ignorado: rate limit de 30s ativo.");
    return;
  }
  localStorage.setItem(LAST_SYNC_KEY, String(now));

  const safePayload = sanitizePayload(payload);

  try {
    await setDoc(workspaceRefFor(auth.currentUser.uid), {
      payload: safePayload,
      ownedBy: auth.currentUser.uid,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email
    }, { merge: true });

    await recordAuditLog({
      action: "workspace.save",
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      timestamp: serverTimestamp(),
      processCount: safePayload.processes?.length || 0,
      clientCount: safePayload.clients?.length || 0
    });
  } catch (error) {
    console.error("Erro ao salvar workspace:", error);
    throw error;
  }
}

async function recordAuditLog(entry) {
  if (!auth.currentUser) return;
  const logRef = doc(db, "audit_logs", `${auth.currentUser.uid}-${Date.now()}`);
  try {
    await setDoc(logRef, entry, { merge: true });
  } catch (error) {
    console.warn("Falha ao registrar log de auditoria:", error);
  }
}

function sanitizePayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === "object" && item !== null ? sanitizePayload(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function sanitizeString(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/\u0000-\u001F\u007F/g, "");
}

async function getIdToken() {
  return auth.currentUser ? auth.currentUser.getIdToken() : "";
}

window.marcaFlowCloud = {
  auth,
  login,
  logout,
  loadWorkspace,
  saveWorkspace,
  getIdToken
};

onAuthStateChanged(auth, user => {
  window.dispatchEvent(new CustomEvent("marcaflow:auth", { detail: { user } }));
});

window.dispatchEvent(new Event("marcaflow:cloud-ready"));
