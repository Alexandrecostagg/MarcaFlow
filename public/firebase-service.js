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
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const workspaceRef = doc(db, "workspaces", "principal");

async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

async function logout() {
  return signOut(auth);
}

async function loadWorkspace() {
  const snapshot = await getDoc(workspaceRef);
  return snapshot.exists() ? snapshot.data().payload : null;
}

async function saveWorkspace(payload) {
  if (!auth.currentUser) return;
  await setDoc(workspaceRef, {
    payload,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser.email
  }, { merge: true });
}

window.marcaFlowCloud = {
  auth,
  login,
  logout,
  loadWorkspace,
  saveWorkspace
};

onAuthStateChanged(auth, user => {
  window.dispatchEvent(new CustomEvent("marcaflow:auth", { detail: { user } }));
});

window.dispatchEvent(new Event("marcaflow:cloud-ready"));
