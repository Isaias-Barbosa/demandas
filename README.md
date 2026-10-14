# 📊 Demandas — do Excel para uma visão clara

Um painel para transformar planilhas de demandas em informação organizada, pesquisável e fácil de acompanhar.

Importe abas de Excel, acompanhe o andamento das solicitações e veja os principais indicadores em um único lugar — sem perder as colunas específicas de cada equipe.

> **Menos caça a informação. Mais clareza sobre o que precisa acontecer.**

## ✨ O que você encontra por aqui

- **Dashboard com indicadores:** total de demandas de Corretivas e Evolutivas; pendências, itens em andamento e conclusões de Corretivas; e visão de status de Corretivas, Evolutivas e GDM STIs.
- **Gráficos por responsável:** Corretivas agrupadas pelo campo de responsável; Evolutivas agrupadas pelos campos Analista e Desenvolvedor.
- **Importação de Excel:** leitura de arquivos `.xlsx` e `.xls`, seleção de abas e escolha da linha de cabeçalho.
- **Colunas dinâmicas:** cada aba mantém seus próprios campos e valores, inclusive nas telas de visualização e edição.
- **Busca, filtros e paginação:** para localizar demandas por texto e acompanhar seus status.
- **Exportação de dados:** gere arquivos com as informações selecionadas.
- **Acesso protegido:** autenticação Supabase e políticas de segurança por usuário (RLS).

## 🧰 Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Aplicação | Next.js 14, React 18, TypeScript |
| Interface | Tailwind CSS, Lucide React, Sonner |
| Gráficos | Recharts |
| Planilhas | SheetJS (`xlsx`) |
| Backend e autenticação | Supabase, PostgreSQL |

## 🚀 Comece em poucos passos

### Pré-requisitos

- Node.js e npm
- Um projeto no [Supabase](https://supabase.com/)

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure o Supabase

Crie um arquivo `.env.local` na raiz, usando `.env.local.example` como modelo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

Os valores estão em **Project Settings → API** no painel do Supabase. Use a chave pública/anon; nunca coloque uma `service_role` no código do navegador ou neste arquivo.

### 3. Prepare o banco

No **SQL Editor** do painel Supabase:

- **Projeto novo:** execute `supabase/schema.sql`.
- **Banco existente:** execute, em ordem, os arquivos de `supabase/migrations/` para adicionar estruturas que estiverem faltando. As migrações incluídas corrigem campos usados pela importação e pela classificação das demandas.

O schema configura tabelas, índices, políticas RLS e atualização automática de `updated_at`. Revise o projeto selecionado no painel antes de executar SQL.

### 4. Inicie a aplicação

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## 📥 Importando uma planilha

1. Entre no sistema com sua conta.
2. Acesse **Importar** e selecione um arquivo `.xlsx` ou `.xls`.
3. Escolha a aba que deseja importar.
4. Informe se os cabeçalhos estão na primeira ou na segunda linha.
5. Confira os dados e inicie a importação.

Os nomes das colunas são preservados para exibição e edição. O sistema também reconhece alguns campos comuns — por exemplo, título, data e status — para alimentar os dados gerais da demanda.

## 🗂️ Categorias e indicadores

- **Corretivas:** tabela e formulário padrão; seus dados alimentam os cards de status do dashboard.
- **Evolutivas:** tabela e edição baseadas nas colunas da planilha; no gráfico por responsável, são considerados **Analista** e **Desenvolvedor**.
- **GDM STIs:** exibe os campos importados e participa do gráfico consolidado de status.
- **Total do dashboard:** soma Corretivas e Evolutivas.

## 🧪 Comandos disponíveis

| Comando | Ação |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção |
| `npm run start` | Inicia a versão de produção já compilada |
| `npm run lint` | Executa o lint configurado pelo Next.js |
| `npx tsc --noEmit` | Verifica os tipos TypeScript |

## 🧭 Estrutura do projeto

```text
src/
├── app/
│   ├── (dashboard)/       # Dashboard, demandas, importar e exportar
│   ├── auth/callback/     # Callback de autenticação
│   └── login/             # Acesso à aplicação
├── components/            # Componentes compartilhados e UI
└── lib/
    ├── supabase/          # Clientes Supabase para navegador e servidor
    └── types.ts           # Tipos e opções de demandas
supabase/
├── migrations/            # Ajustes incrementais do banco
└── schema.sql             # Schema inicial
```

## 🔐 Segurança

As tabelas de dados usam **Row Level Security (RLS)** para restringir o acesso às informações do usuário autenticado. Mantenha as políticas habilitadas e nunca compartilhe chaves privadas ou credenciais no repositório.

---

<p align="center">
  Feito para deixar a gestão de demandas mais simples — uma planilha de cada vez. ✨
</p>
