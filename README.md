<div align="center">

# 📊 Demandas

### Sua operação, sem perder nenhuma linha.

Planilhas chegam cheias de informação. O **Demandas** transforma cada aba em um espaço de trabalho claro: importe, organize, acompanhe e descubra o que pede atenção.

<br />

`CORRETIVAS` &nbsp; · &nbsp; `EVOLUTIVAS` &nbsp; · &nbsp; `GDM STIs` &nbsp; · &nbsp; `SUAS CATEGORIAS`

<br />

**Menos caça à planilha. Mais clareza para fazer acontecer.**

</div>

---

## 🪄 Uma planilha entra. Uma visão de trabalho sai.

O Dashboard de Demandas reúne solicitações, campos próprios de cada equipe e indicadores em um único lugar. As colunas da planilha são preservadas, para que os dados continuem fazendo sentido depois da importação.

### O que você pode fazer

- 📥 **Importar Excel** — envie arquivos `.xlsx` ou `.xls`, escolha uma aba e indique a linha de cabeçalho.
- 🧩 **Manter campos da equipe** — categorias personalizadas exibem e permitem editar os próprios campos da planilha.
- 🔎 **Encontrar mais rápido** — pesquise, filtre por status e navegue pelos registros paginados.
- 📈 **Acompanhar o panorama** — consulte indicadores, distribuição de status e evolução mensal.
- 👥 **Entender a distribuição** — veja responsáveis de Corretivas e acompanhe Analista e Desenvolvedor em Evolutivas.
- 📤 **Levar os dados com você** — exporte as informações selecionadas.
- 🔐 **Trabalhar com acesso protegido** — autenticação e políticas de acesso por usuário via Supabase RLS.

## 📊 Como ler o dashboard

| Indicador | O que considera |
| --- | --- |
| **Total de demandas** | Corretivas + Evolutivas |
| **Pendentes, Em Andamento e Concluídas** | Demandas de Corretivas |
| **Demandas por Status** | Corretivas + Evolutivas + GDM STIs |
| **Responsáveis — Corretivas** | Campo `responsavel` |
| **Responsáveis — Evolutivas** | Campos `Analista` e `Desenvolvedor` |

## 🧰 A caixa de ferramentas

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js 14 · React 18 · TypeScript |
| Interface | Tailwind CSS · Lucide React · Sonner |
| Gráficos | Recharts |
| Planilhas | SheetJS (`xlsx`) |
| Autenticação e banco | Supabase · PostgreSQL |

## 🚀 De zero ao painel

### Antes de começar

- Node.js e npm instalados
- Um projeto no [Supabase](https://supabase.com/)

### 1. Instale as dependências

```bash
npm install
```

### 2. Conecte o Supabase

Copie `.env.local.example` para `.env.local` na raiz do projeto e preencha com os dados do seu projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

Você encontra esses valores em **Supabase → Project Settings → API**. Não use uma chave `service_role` no navegador nem em variáveis `NEXT_PUBLIC_*`.

### 3. Prepare o banco

Abra o **SQL Editor** do Supabase:

- **Banco novo:** execute `supabase/schema.sql`.
- **Banco existente:** execute os arquivos de `supabase/migrations/` em ordem cronológica.

O schema inicial define as tabelas, índices, políticas RLS e atualização automática de `updated_at`. Confira o projeto selecionado antes de executar qualquer script SQL.

### 4. Acenda o painel

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), crie uma conta ou entre no sistema — e pronto.

## 📥 Rota rápida: importar uma planilha

```text
Importar arquivo → Escolher aba → Definir cabeçalho → Confirmar → Acompanhar
```

1. Acesse **Importar** e selecione um arquivo `.xlsx` ou `.xls`.
2. Escolha a aba que deseja trazer para o painel.
3. Indique se os nomes das colunas estão na primeira ou na segunda linha.
4. Confirme a importação e abra a categoria criada.

O sistema preserva os nomes e valores das colunas. Quando possível, reconhece também campos comuns, como título, data e status.

## 🧭 Navegue pelo código

```text
src/
├── app/
│   ├── (dashboard)/          # Dashboard, demandas, importar e exportar
│   ├── auth/callback/        # Retorno da autenticação Supabase
│   └── login/                # Entrada e cadastro
├── components/               # Navegação e componentes de interface
└── lib/
    ├── supabase/             # Clientes para navegador e servidor
    └── types.ts              # Tipos e opções de domínio
supabase/
├── migrations/               # Atualizações incrementais do banco
└── schema.sql                # Estrutura inicial
```

## 🧪 Comandos de bordo

| Comando | Ação |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versão otimizada para produção |
| `npm run start` | Executa a versão já compilada |
| `npm run lint` | Executa o lint configurado pelo Next.js |
| `npx tsc --noEmit` | Verifica os tipos TypeScript |

## 🔒 Seus dados, suas demandas

As tabelas de demandas e categorias usam **Row Level Security (RLS)** para limitar o acesso aos registros do usuário autenticado. Mantenha as políticas habilitadas e não publique credenciais privadas no repositório.

---

<div align="center">

**Cada demanda no lugar certo. Cada próximo passo mais visível.** ✨

</div>
