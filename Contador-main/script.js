const tasks = [
    'Limpar bancada',
    'Limpar teclados',
    'Limpar janelas',
    'Verificar privada',
    'Verificar louça',
    'Passar pano no banheiro',
    'Jogar cheiro no banheiro',
    'Verificar gasolina na moto',
    'Fazer planilha de chegada',
    'Fazer word de caminhões de terra (se for dia de caminhão de terra)',
    'Verificar câmera por câmera',
    'Ir tirando os habilitados',
    'Marcar calendário',
    'Estudar 30 min',
    'Trocar saco de lixo',
    'Verificar a guarita',
    'Trabalhar um pouco no projeto ponto',
    'Encher o galão de água',
    'Fazer livro de ocorrências',
];

// Carregar estado salvo
function loadChecklist() {
    const saved = JSON.parse(localStorage.getItem('checklist')) || {};
    const list = document.getElementById('task-list');
    list.innerHTML = '';

    tasks.forEach((task, index) => {
        const li = document.createElement('li');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'task-' + index;
        checkbox.checked = saved[index] || false;

        checkbox.addEventListener('change', () => {
            saved[index] = checkbox.checked;
            localStorage.setItem('checklist', JSON.stringify(saved));
        });

        const label = document.createElement('label');
        label.htmlFor = 'task-' + index;
        label.innerText = task;

        li.appendChild(checkbox);
        li.appendChild(label);
        list.appendChild(li);
    });
}

// Resetar checklist
function resetChecklist() {
    if (confirm('Tem certeza que deseja resetar toda a checklist, senhor Alonso?')) {
        localStorage.removeItem('checklist');
        loadChecklist();
    }
}

window.onload = loadChecklist;
