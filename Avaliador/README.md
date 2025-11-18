# Avaliador de Filmes e Séries (Frontend)

Frontend simples em HTML/CSS/JS usando Tailwind que consome a API REST do Supabase.

## O que tem aqui
- `index.html` — página principal.
- `main.js` — lógica do frontend, integra com Supabase REST para CRUD.
- `config.template.js` — modelo; renomeie para `config.js` e preencha com suas credenciais.
- `sql/setup.sql` — SQL para criar as tabelas `genres` e `reviews` no Supabase.

## Requisitos (no Supabase)
1. Crie um projeto no Supabase.
2. No SQL Editor, execute `sql/setup.sql` para criar as tabelas.
3. Em Settings > Auth > Providers: (opcional) ative Google se quiser OAuth. O projeto agora inclui
   uma página de login por email/senha em `login.html`.
   - Configure o Redirect URL para `http://localhost:5500/` (ou a URL onde vai servir o frontend) se usar OAuth.
4. Obtenha sua `anon` key (chave pública) e a URL do projeto.

## Configuração local
1. Copie `config.template.js` para `config.js` e preencha:

   const SUPABASE_URL = "https://your-project-ref.supabase.co";
   const SUPABASE_ANON_KEY = "your-anon-or-public-api-key";

2. Abra `index.html` num servidor local (recomendado). Por exemplo, com Python: 

```powershell
# no Windows PowerShell
python -m http.server 5500
# depois abra http://localhost:5500/
```

3. Abra `login.html` (ou clique em "Entrar" na `index.html`) para fazer login por email/senha ou cadastrar um novo usuário.
   - Ao entrar com sucesso, o token de autenticação é salvo em `localStorage` e você será redirecionado para `index.html`.

## Observações importantes
- As chamadas ao Supabase REST exigem que a tabela permita acesso via anon key ou que você configure políticas RLS apropriadas.
- Para projetos de produção, **nunca** exponha chaves secretas. Use chaves públicas (anon) e políticas RLS.

## Próximos passos sugeridos
- Implementar políticas RLS para que apenas o dono da avaliação possa editar/excluir.
- Adicionar paginação e filtros (por gênero, nota, tipo).
- Melhorar UI/UX com animações e imagens de pôsteres.
 - Campo de gênero: agora o usuário digita o gênero; o frontend tenta resolver um `genre_id` existente
    no banco e, se necessário, cria um novo registro em `genres` automaticamente.

Boa sorte! Se quiser, eu já configuro políticas de RLS/SQL adicionais ou adapto a UI para suportar imagens e busca.