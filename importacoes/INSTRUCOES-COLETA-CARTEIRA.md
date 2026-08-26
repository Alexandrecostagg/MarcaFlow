# Coleta da carteira real de marcas

Preencha `modelo-carteira-marcas.csv` com uma linha por processo. Salve-o em CSV separado por ponto e vírgula (`;`) e importe-o no painel em **Processos > Importar carteira**.

Os campos obrigatórios para importar são:

- `marca`: sinal exatamente como usado ou apresentado no pedido;
- `titular`: nome completo ou razão social do titular;
- `classes`: classes de Nice, separadas por vírgula;
- `numero_processo`: obrigatório apenas para entrar no monitoramento automático da RPI.

Para uma carteira operacional completa, colete também:

- Titularidade: `cpf_cnpj`, `perfil`, `natureza_juridica`, `atividade_compativel`, contato e e-mail. A atividade deve ser compatível com os produtos/serviços reivindicados.
- Desconto INPI: use `categoria_desconto_inpi` com um dos valores: `pessoa_natural`, `mei`, `microempresa`, `epp`, `empresa_simples_inovacao`, `ict`, `sem_fins_lucrativos`, `orgao_publico`, `hipossuficiente`, `pcd`, `nao_elegivel` ou `a_confirmar`. Para pessoa natural, preencha `pf_sem_participacao_no_ramo` com `Sim` somente após a confirmação aplicável. Em cotitularidade, informe `cotitulares_elegiveis` como `Sim`, `Não` ou `A confirmar`; o desconto só é aplicável se todos fizerem jus a ele. Registre a evidência em `comprovante_desconto`.
- Escopo do pedido: `apresentacao`, `natureza`, `produtos_servicos`, `canais_venda`, `area_atuacao` e `logo_arquivo` quando houver elemento gráfico.
- Situação processual: `etapa`, `status`, `data_deposito`, `ultima_rpi`, despacho, publicação, próxima ação e os dois prazos.
- Análise: `risco_anterioridade` e `observacoes`, inclusive marcas semelhantes, oposição, exigência e documentos pendentes.

Use datas no formato `AAAA-MM-DD`. Para cada prazo, registre `prazo_legal` (data oficial) e `prazo_interno` (em regra, pelo menos cinco dias antes; para prazo legal de cinco dias, um dia antes).

Não preencha uma linha de processo ainda inexistente no INPI com número fictício. Processos sem número ficam organizados no painel, mas não são exportados para o monitor da RPI.

Antes de protocolar, decidir sobre riscos ou cumprir prazo, confirme a publicação na RPI e as fontes oficiais atuais do INPI. O painel e a planilha são controles operacionais, não parecer jurídico.

O painel usa taxa integral enquanto o enquadramento estiver pendente. Para os grupos com redução de 50%, a confirmação é feita no cadastro/e-INPI; para pessoa física hipossuficiente ou PcD, a estimativa de 100% fica restrita aos serviços de entrada elegíveis e exige conferência no INPI.
