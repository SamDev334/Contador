// Lista de livros disponíveis na aba "Leitura" do site.
//
// Como adicionar um livro novo:
//   1. Coloque o arquivo PDF dentro desta pasta "livros/" (pode subir junto no GitHub).
//   2. Adicione um objeto novo no array LIVROS abaixo, com os campos explicados aqui:
//
//      id        -> identificador único do livro, sem espaços e sem acentos (ex: "arte-da-guerra")
//      titulo    -> título mostrado no site
//      autor     -> nome do autor
//      categoria -> categoria do livro (livros da mesma categoria ficam agrupados nos filtros)
//      arquivo   -> nome exato do arquivo PDF dentro desta pasta (ex: "arte-da-guerra.pdf")
//      cor       -> opcional: cor de destaque da capa, em hexadecimal (ex: "#c9952e")
//
// Dica: respeite maiúsculas/minúsculas no nome do arquivo. No GitHub Pages isso faz diferença.

window.LIVROS = [
  {
    id: "ebook.pdf",
    titulo: "Italiano Ebook Completo",
    autor: "Italiano Na Prática",
    categoria: "Idiomas",
    arquivo: "ebook.pdf",
    cor: "#c9952e",
  },
];
