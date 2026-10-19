# Finzero - Sistema de Distribuição de Atendentes WhatsApp & Landing Page

Plataforma digital da Finzero com simulador de crédito online, landing page de alta conversão em conformidade com as diretrizes do Kwai Ads, e sistema **real** de rodízio e distribuição de atendentes WhatsApp com persistência PostgreSQL no Supabase, Edge Functions com trava de concorrência e deploy estático no Cloudflare Pages via GitHub.

---

## 🚀 Arquitetura e Recursos Implementados

1. **Rodízio Atômico Concorrente (PostgreSQL Stored Procedure)**:
   - Trava de linha transacional (`SELECT ... FOR UPDATE`) na tabela `rotation_state` impedindo condições de corrida quando múltiplos leads solicitam atendimento ao mesmo tempo.
   - Idempotência rigorosa via `attempt_id` único enviado pelo cliente: previne duplo clique e cliques acidentais repetidos.
   - Distribuição round-robin determinística ordenada por `display_order`, `created_at` e `id`.
   - Ignora automaticamente atendentes desativados ou excluídos logicamente, retornando ao primeiro atendente ao final da fila.
   - Alerta visual caso não haja atendentes ativos, sem redirecionar indevidamente.
   - Redirecionamento exclusivo para `https://wa.me/NUMERO` apenas **após** persistência com sucesso no banco.

2. **Privacidade e LGPD**:
   - Nenhum dado pessoal sensível (CPF, data de nascimento, renda ou dados bancários) é gravado no histórico de encaminhamentos ou exposto no texto preenchido do WhatsApp.
   - Apenas o primeiro nome e o valor/parcelas da simulação são usados na mensagem de abertura.

3. **Painel Administrativo (`/painel`)**:
   - Acesso direto pela URL `/painel` com fallback SPA configurado para Cloudflare Pages (`public/_redirects`).
   - Autenticação restrita por senha no backend (`ADMIN_PASSWORD`), sem senhas hardcoded no frontend nem no GitHub.
   - Proteção contra força bruta (limite de 5 tentativas incorretas por IP a cada 15 minutos).
   - Sessões criptográficas com token SHA-256 e expiração validada no servidor.
   - Gestão completa de atendentes: cadastro com validação de número internacional apenas dígitos (ex: `5511970810467`), edição, pausa/reativação e exclusão lógica com modal de confirmação.
   - Métricas em tempo real no fuso `America/Sao_Paulo` com intervalos inclusivos de dias de calendário: **Hoje**, **7 dias**, **15 dias**, **30 dias** e **Total Geral**, com contagem clara de *encaminhamentos realizados* (sem afirmar mensagens recebidas).

4. **Isolamento de Ambientes**:
   - Detecção em tempo real de credenciais do Supabase (`isSupabaseConfigured`).
   - Modo Demonstração claramente identificado na interface para testes locais e preview quando o Supabase ainda não foi conectado.
   - Erros explícitos de rede e conexão em produção (nunca fallback silencioso para dados falsos).

---

## 🛠️ Passo a Passo de Configuração do Supabase

### Passo 1: Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Anote a **URL do Projeto** e a chave pública **Anon Key** (em *Project Settings* -> *API*).

### Passo 2: Executar a Migration SQL
1. No painel do Supabase, abra o menu **SQL Editor**.
2. Abra o arquivo localizado neste repositório em:
   ```
   supabase/migrations/20261018000000_whatsapp_rotation.sql
   ```
3. Cole o conteúdo no SQL Editor do Supabase e clique em **Run**.
4. Esta migration cria:
   - Tabela `public.attendants` (com suporte a soft delete);
   - Tabela `public.rotation_state` (cursor do rodízio);
   - Tabela `public.lead_dispatches` (histórico de encaminhamentos com chave de idempotência);
   - Tabela `public.admin_sessions` (sessões de administrador com expiração);
   - Tabela `public.admin_auth_attempts` (rate limiting contra força bruta);
   - Habilita RLS em todas as tabelas (nenhuma tabela acessível diretamente pela chave anon pública);
   - Funções atômicas `distribute_next_attendant` e `get_rotation_metrics` com permissão exclusiva `service_role`.

### Passo 3: Configurar o Segredo ADMIN_PASSWORD no Supabase
A senha de administrador deve ser configurada **apenas como segredo do backend**:

**Opção A (Via Supabase CLI):**
```bash
supabase login
supabase link --project-ref seu-project-ref
supabase secrets set ADMIN_PASSWORD="sua-senha-super-segura-aqui"
```

**Opção B (Pelo Painel Web do Supabase):**
1. Vá em **Project Settings** -> **Edge Functions** -> **Secrets**.
2. Clique em **Add new secret**:
   - Nome: `ADMIN_PASSWORD`
   - Valor: sua senha desejada para acessar o `/painel`.

### Passo 4: Fazer Deploy das Edge Functions
Faça o deploy das 4 Edge Functions contidas na pasta `supabase/functions`:
```bash
supabase functions deploy distribute-lead --no-verify-jwt
supabase functions deploy admin-auth --no-verify-jwt
supabase functions deploy admin-attendants --no-verify-jwt
supabase functions deploy admin-metrics --no-verify-jwt
```

---

## ☁️ Deploy no Cloudflare Pages (com GitHub Conectado)

Como o repositório GitHub já está conectado ao Cloudflare Pages:

1. Acesse o dashboard do **Cloudflare** -> **Workers & Pages**.
2. Selecione o projeto do Cloudflare Pages conectado a este repositório.
3. Em **Settings** -> **Builds & deployments**:
   - **Framework preset**: `Vite` (ou `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
4. Em **Settings** -> **Environment variables**:
   Adicione as variáveis públicas de produção:
   - `VITE_SUPABASE_URL`: `https://seu-projeto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sua-chave-publica-anon`
5. **Fallback SPA `/painel`**:
   O arquivo `public/_redirects` já está incluso na raiz pública do projeto com a regra:
   ```
   /* /index.html 200
   ```
   Isso garante que ao recarregar ou acessar diretamente `https://seu-dominio.pages.dev/painel`, o Cloudflare Pages entrega o `index.html` e o roteador interno renderiza o painel instantaneamente.
6. Clique em **Save and Deploy**.

---

## 🧪 Como Executar os Testes Automatizados

A suíte de testes valida o rodízio, idempotência, pausas, exclusões lógicas e cálculos de fuso:

```bash
# Executa a suíte de testes de rodízio e métricas
npm test

# Executa a verificação de tipos e compilação de produção
npm run lint
npm run build
```

---

## 📂 Estrutura de Arquivos

```
├── .env.example                                      # Exemplo de variáveis de ambiente do cliente
├── index.html                                        # Ponto de entrada com meta tags e branding
├── public/
│   └── _redirects                                    # Fallback SPA para Cloudflare Pages
├── src/
│   ├── App.tsx                                       # Roteamento SPA (/ e /painel) e layout
│   ├── components/
│   │   ├── AdminPanel.tsx                            # Painel administrativo com cor #05BCB4
│   │   ├── Header.tsx                                # Cabeçalho clean com logo F
│   │   ├── LoanSimulator.tsx                         # Simulador interativo com envio direto para WhatsApp
│   │   └── ...                                       # Demais componentes institucionais e LGPD
│   └── services/
│       └── whatsappService.ts                        # Cliente Supabase Edge Functions + modo demo
├── supabase/
│   ├── functions/
│   │   ├── admin-auth/index.ts                       # Autenticação com rate limiting e hash
│   │   ├── admin-attendants/index.ts                 # CRUD seguro de atendentes com soft delete
│   │   ├── admin-metrics/index.ts                    # Métricas em America/Sao_Paulo
│   │   └── distribute-lead/index.ts                  # Endpoint de encaminhamento transacional
│   └── migrations/
│       └── 20261018000000_whatsapp_rotation.sql     # Migration SQL completa com RLS e Locks
└── tests/
    └── rotation.test.ts                              # 23 testes unitários e de integração
```
