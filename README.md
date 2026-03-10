# Analisador de Estoque de Farmácia

Aplicação web para análise de estoque farmacêutico com foco em ruptura, excesso, giro e indicadores financeiros.

## O que a ferramenta faz

- Importa planilhas de vendas (90 dias) e inventário.
- Consolida dados por SKU (EAN/código interno).
- Calcula indicadores de estoque e performance comercial:
  - índice de faltas;
  - excesso de estoque;
  - itens parados (sem giro);
  - cobertura em dias;
  - curva ABC.
- Exibe histórico de execuções por cliente.
- Permite exportações (PDF e XLS) para uso operacional e consultivo.
- Suporta operação multi-cliente com autenticação e controle de acesso.

## Tecnologias utilizadas

### Frontend
- Angular 18 (standalone components)
- TypeScript
- Tailwind CSS
- RxJS
- Chart.js (gráficos de evolução)

### Backend e dados
- API REST própria (endpoint configurado em `API_URL`)
- MongoDB (persistência das análises e histórico)
- Supabase Auth (autenticação de usuários)

### Infraestrutura e deploy
- Docker
- Nginx (servidor web do frontend)
- Docker Swarm + Traefik (orquestração e roteamento em produção)

## Como rodar localmente

### Pré-requisitos
- Node.js 20+
- npm

### Passos
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Revise as configurações em:
   - `src/environments/environment.ts`
3. Execute o frontend:
   ```bash
   npm run dev
   ```
4. Build de produção:
   ```bash
   npm run build
   ```

## Estrutura principal

- `src/components`: telas e componentes da aplicação
- `src/services`: integração com API, autenticação e regras de negócio
- `src/models`: modelos de dados usados no frontend
- `supabase/functions`: funções auxiliares versionadas no projeto

## Deploy em produção (Docker Swarm)

Referência de ambiente (modelo):
- Servidor: `<deploy-user>@<deploy-host>`
- Diretório da aplicação: `/opt/<app-dir>`
- Stack file: `<stack-file>.yml`
- Serviço: `<stack>_<service>`
- URL pública: `https://<seu-dominio>`

### Pré-requisitos
- Docker e Swarm ativos no servidor.
- Rede externa do proxy/reverse proxy já criada (ex.: Traefik).
- Acesso SSH ao servidor.
- Usuário de deploy com permissões mínimas (evite `root`).

### Passo a passo
1. Sincronize o código local para o servidor:
   ```bash
   rsync -avz --delete \
     --exclude 'node_modules' --exclude '.angular' --exclude 'dist' --exclude '.git' \
     ./ <deploy-user>@<deploy-host>:/opt/<app-dir>/
   ```
2. Gere a imagem do frontend no servidor:
   ```bash
   ssh <deploy-user>@<deploy-host> \
     "cd /opt/<app-dir> && docker build -t <frontend-image>:latest ."
   ```
3. Aplique/atualize a stack:
   ```bash
   ssh <deploy-user>@<deploy-host> \
     "cd /opt/<app-dir> && docker stack deploy -c <stack-file>.yml <stack-name>"
   ```
4. Force rollout para garantir nova task com a imagem recém-buildada:
   ```bash
   ssh <deploy-user>@<deploy-host> \
     "docker service update --force <stack>_<service>"
   ```
5. Valide status do serviço e publicação:
   ```bash
   ssh <deploy-user>@<deploy-host> \
     "docker service ps --no-trunc <stack>_<service> | sed -n '1,10p'"
   curl -I https://<seu-dominio>
   ```

## Observações

- O frontend depende do backend/API para leitura e gravação de dados.
- O comportamento de autenticação depende da configuração do Supabase Auth do ambiente.
- Não publique em repositório público IPs, usuários, paths internos, nomes reais de serviço e comandos com detalhes sensíveis.
- Mantenha runbooks com dados reais em documentação privada.
