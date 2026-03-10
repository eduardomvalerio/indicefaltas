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

Referência atual de ambiente:
- Servidor: `root@147.79.81.247`
- Diretório da aplicação: `/opt/faltas-frontend`
- Stack file: `docker-stack-faltas-frontend.yml`
- Serviço: `faltas-fe_faltas-frontend`
- URL: `https://faltas.farmabrasilcontabilidade.com.br`

### Pré-requisitos
- Docker e Swarm ativos no servidor.
- Rede externa do Traefik já criada (`eduardo`).
- Acesso SSH ao servidor.

### Passo a passo
1. Sincronize o código local para o servidor:
   ```bash
   rsync -avz --delete \
     --exclude 'node_modules' --exclude '.angular' --exclude 'dist' --exclude '.git' \
     -e "ssh -o StrictHostKeyChecking=no" \
     ./ root@147.79.81.247:/opt/faltas-frontend/
   ```
2. Gere a imagem do frontend no servidor:
   ```bash
   ssh -o StrictHostKeyChecking=no root@147.79.81.247 \
     "cd /opt/faltas-frontend && docker build -t faltas-frontend:latest ."
   ```
3. Aplique/atualize a stack:
   ```bash
   ssh -o StrictHostKeyChecking=no root@147.79.81.247 \
     "cd /opt/faltas-frontend && docker stack deploy -c docker-stack-faltas-frontend.yml faltas-fe"
   ```
4. Force rollout para garantir nova task com a imagem recém-buildada:
   ```bash
   ssh -o StrictHostKeyChecking=no root@147.79.81.247 \
     "docker service update --force faltas-fe_faltas-frontend"
   ```
5. Valide status do serviço e publicação:
   ```bash
   ssh -o StrictHostKeyChecking=no root@147.79.81.247 \
     "docker service ps --no-trunc faltas-fe_faltas-frontend | sed -n '1,10p'"
   curl -I https://faltas.farmabrasilcontabilidade.com.br
   ```

## Observações

- O frontend depende do backend/API para leitura e gravação de dados.
- O comportamento de autenticação depende da configuração do Supabase Auth do ambiente.
