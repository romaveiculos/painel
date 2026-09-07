# Painel Roma Veículos

Painel administrativo para gerenciar estoque, fotos, vídeos e dados de contato do site Roma Veículos.

## Primeiro acesso

1. Abra o painel publicado e escolha **Criar primeiro acesso**.
2. Use o e-mail autorizado pelo responsável do projeto.
3. Confirme o e-mail recebido e entre com a senha cadastrada.

O banco usa RLS e uma lista privada de administradores, que não fica exposta neste repositório. Outros e-mails não recebem acesso ao painel nem aos dados administrativos.

## Desenvolvimento

```bash
npm install
npm run dev
```

As variáveis públicas do Supabase já possuem valores padrão para facilitar a publicação. Elas também podem ser definidas com os nomes presentes em `.env.example`.

## Banco de dados

A estrutura completa está em `supabase/migrations/20260907150000_initial_admin.sql` e inclui autenticação, estoque, configurações, mídias, bucket e políticas RLS.
