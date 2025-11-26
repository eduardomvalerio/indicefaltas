# Guia de Implantação: Análise de Farmácia com Supabase

Este guia detalha os passos para configurar o backend no Supabase e implantar o frontend Angular em uma plataforma como Vercel ou Netlify.

## Parte 1: Configuração do Supabase

### 1. Criar um Novo Projeto
1.  Acesse [supabase.com](https://supabase.com) e faça login.
2.  Clique em "New project".
3.  Escolha uma organização, dê um nome ao projeto (ex: `analise-farmacia`), gere uma senha segura para o banco de dados e escolha a região mais próxima de você.
4.  Aguarde a criação do projeto.

### 2. Aplicar o Schema do Banco de Dados
1.  No painel do seu projeto Supabase, vá para a seção "SQL Editor".
2.  Clique em "+ New query".
3.  Copie todo o conteúdo do arquivo `supabase/migrations/initial_schema.sql` do seu projeto.
4.  Cole o conteúdo no editor de SQL.
5.  Clique em "RUN" para executar o script e criar todas as tabelas, índices, funções e políticas de segurança (RLS).

### 3. Configurar o Storage
1.  Vá para a seção "Storage" no menu lateral.
2.  Clique em "Create a new bucket".
3.  Nomeie o bucket exatamente como `farmacia-analises`.
4.  Deixe-o como um bucket privado (desmarque a opção "Public bucket").
5.  Clique em "Create bucket".

#### 3.1. Políticas de Acesso ao Storage (Obrigatório)
As políticas garantem que um usuário só possa acessar os arquivos da sua própria organização.
1.  Ainda na seção "Storage", clique nos três pontos (...) ao lado do seu bucket `farmacia-analises` e selecione "Policies".
2.  Clique em "New Policy" > "Create a new policy from scratch".
3.  Crie as seguintes políticas:

    **Política 1: Leitura (SELECT)**
    - **Policy Name:** `Leitura para membros da organização`
    - **Allowed operation:** `SELECT`
    - **Policy definition (USING expression):**
      ```sql
      (bucket_id = 'farmacia-analises' AND (storage.foldername(name))[1] = public.current_org_id()::text)
      ```
    - Clique em "Review" e "Save policy".

    **Política 2: Escrita (INSERT)**
    - **Policy Name:** `Upload para membros da organização`
    - **Allowed operation:** `INSERT`
    - **Policy definition (WITH CHECK expression):**
      ```sql
      (bucket_id = 'farmacia-analises' AND (storage.foldername(name))[1] = public.current_org_id()::text)
      ```
    - Clique em "Review" e "Save policy".

### 4. Obter as Chaves de API
1.  Vá para a seção "Project Settings" (ícone de engrenagem).
2.  Clique em "API".
3.  Você precisará de duas informações aqui:
    - **Project URL** (ex: `https://seunome.supabase.co`)
    - **Project API Keys** > `anon` `public` (a chave longa)

Guarde esses valores, eles serão usados no frontend.

## Parte 2: Configuração e Deploy do Frontend (Vercel/Netlify)

### 1. Preparar o Projeto
Certifique-se que seu código está em um repositório Git (GitHub, GitLab, etc.).

### 2. Configurar Variáveis de Ambiente
Tanto na Vercel quanto na Netlify, você precisará configurar as seguintes variáveis de ambiente no painel do seu site:

-   `NG_APP_SUPABASE_URL`: Cole a **Project URL** do Supabase aqui.
-   `NG_APP_SUPABASE_ANON_KEY`: Cole a chave **anon public** do Supabase aqui.

O arquivo `src/environments/environment.ts` já está configurado para ler essas variáveis.

### 3. Configurações de Build
O projeto é um aplicativo Angular padrão. As configurações de build geralmente são detectadas automaticamente, mas se precisar, use:
-   **Build Command:** `npm install && npm run build` (ou o que for apropriado para seu setup)
-   **Output Directory:** `dist/` (ou o diretório de saída do seu build)
-   **Install Command:** `npm install`

### 4. Regra de Redirecionamento (IMPORTANTE)
Como é um Single Page Application (SPA), você precisa garantir que todas as requisições de rota sejam direcionadas para o `index.html`.

-   **Para a Vercel:** Crie um arquivo `vercel.json` na raiz do seu projeto com o seguinte conteúdo:
    ```json
    {
      "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }
    ```
-   **Para a Netlify:** Crie um arquivo `_redirects` na sua pasta `src` com o seguinte conteúdo:
    ```
    /*    /index.html    200
    ```
    E certifique-se que seu `angular.json` (se você tivesse um) estaria configurado para copiar este arquivo para a pasta de build. No nosso caso, a Vercel é mais direta.

### 5. Fazer o Deploy
1.  Conecte seu repositório Git à Vercel ou Netlify.
2.  Configure o projeto conforme as instruções acima (variáveis de ambiente, build command).
3.  Inicie o deploy.

Após o deploy, seu aplicativo estará online e conectado ao seu backend Supabase!

## Parte 3: Criando os Primeiros Usuários (Pós-Deploy)

Como não há uma tela de cadastro, você pode criar os primeiros usuários e associá-los a uma organização diretamente no Supabase:

1.  **Crie uma Organização:**
    -   Vá para "Table Editor" > `orgs` e clique em "Insert row". Dê um nome à sua organização (ex: "Farma Brasil Contabilidade") e salve. Copie o `id` da organização criada.
2.  **Crie um Usuário:**
    -   Vá para "Authentication" > "Users" e clique em "Invite". Insira o e-mail do usuário (ex: `contato@farmabrasilcontabilidade.com.br`).
    -   O usuário receberá um e-mail para definir a senha.
3.  **Associe o Usuário à Organização:**
    -   Vá para "Authentication" > "Users" e copie o `ID` do usuário que você acabou de criar.
    -   Vá para "Table Editor" > `org_members` e clique em "Insert row".
    -   Cole o `ID` do usuário em `user_id` e o `id` da organização em `org_id`.
    -   Defina o `role` como `admin` ou `colaborador`.
    -   Salve.

Agora o usuário pode fazer login na aplicação e começar a usar!
