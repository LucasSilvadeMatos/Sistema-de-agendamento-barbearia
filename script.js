// =========================================================================
// 1. MODELAGEM DE DADOS (Simulação de Banco de Dados com LocalStorage)
//    *** Imagens removidas e substituídas por dados simples ***
// =========================================================================

const BARBERS = [
    { id: 1, name: "Lucas 'O Fera'", specialty: "Corte Moderno" },
    { id: 2, name: "André 'Classic'", specialty: "Barba e Clássicos" },
    { id: 3, name: "Mariana 'Expert'", specialty: "Coloração e Estilo" }
];

const SERVICES = [
    { id: 101, name: "Corte Simples (30 min)", duration: 30, price: 45.00 },
    { id: 102, name: "Corte e Barba (60 min)", duration: 60, price: 90.00 },
    { id: 103, name: "Barba Tradicional (30 min)", duration: 30, price: 50.00 },
    { id: 104, name: "Química / Coloração (120 min)", duration: 120, price: 150.00 }
];

// Horários de funcionamento (Regra de Negócio)
const BUSINESS_HOURS = {
    start: 9, // 9h00
    end: 19,  // 19h00 (Até 19h00, mas o último agendamento deve caber antes)
    interval: 30 // Slots de 30 minutos
};

// Inicializa a base de agendamentos no LocalStorage
function initAppointmentsDB() {
    if (!localStorage.getItem('appointments')) {
        // Exemplo de agendamento prévio para testes de conflito (25 de Novembro de um ano futuro)
        const initialAppointments = [
            { id: Date.now() + 1, barberId: 1, serviceId: 102, clientName: 'João Silva', date: '2025-11-25', time: '10:00', duration: 60, status: 'Confirmado' },
            { id: Date.now() + 2, barberId: 2, serviceId: 101, clientName: 'Maria Antunes', date: '2025-11-25', time: '14:30', duration: 30, status: 'Confirmado' },
        ];
        localStorage.setItem('appointments', JSON.stringify(initialAppointments));
    }
}

// =========================================================================
// 2. VARIÁVEIS DE ESTADO E FUNÇÕES DE UTILIDADE
// =========================================================================

let currentStep = 1;
let selectedBarber = null;
let selectedService = null;
let selectedDate = null;
let selectedTime = null;

// Avança para o próximo passo no formulário
function goToStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    currentStep = stepNumber;
}

// Exibe o Pop-up (Modal)
function showModal(title, message, isSuccess = true) {
    const modal = document.getElementById('modal');
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-message').innerHTML = message;
    
    const okBtn = document.getElementById('modal-ok');
    okBtn.className = isSuccess ? 'btn primary-btn' : 'btn back-btn';

    modal.style.display = 'block';
}

// Fecha o Modal e Reinicia o Agendamento
function closeModalAndRestart() {
    document.getElementById('modal').style.display = 'none';
    
    // Reseta o estado
    selectedBarber = null;
    selectedService = null;
    selectedDate = null;
    selectedTime = null;
    
    // Limpa seleções visuais e volta para o passo 1
    document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.service-item').forEach(c => c.classList.remove('selected'));
    document.getElementById('confirmation-form').reset();
    goToStep(1);
}

// =========================================================================
// 3. RENDERIZAÇÃO E EVENTOS DE DOM
// =========================================================================

// Função para renderizar os cards dos barbeiros (Passo 1)
function renderBarbers() {
    const container = document.getElementById('barber-list');
    container.innerHTML = '';
    
    BARBERS.forEach(barber => {
        const card = document.createElement('div');
        card.className = 'barber-card';
        card.setAttribute('data-id', barber.id);
        
        // Renderiza a inicial do nome no círculo (substituindo a imagem)
        card.innerHTML = `
            <div>${barber.name.charAt(0)}</div>
            <h3>${barber.name}</h3>
            <p>${barber.specialty}</p>
        `;
        
        // Evento de seleção
        card.addEventListener('click', () => {
            selectedBarber = barber;
            document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            goToStep(2); 
            renderServices(); 
        });
        container.appendChild(card);
    });
}

// Função para renderizar os serviços (Passo 2)
function renderServices() {
    const container = document.getElementById('service-list');
    container.innerHTML = '';
    
    // Remove o botão de avançar anterior se existir
    const existingNextBtn = document.querySelector('#service-list .primary-btn');
    if (existingNextBtn) existingNextBtn.remove();
    
    SERVICES.forEach(service => {
        const item = document.createElement('div');
        item.className = 'service-item';
        item.setAttribute('data-id', service.id);
        item.innerHTML = `
            <div>
                <strong>${service.name}</strong>
                <span>(${service.duration} min)</span>
            </div>
            <span>R$ ${service.price.toFixed(2)}</span>
            <input type="checkbox" id="service-${service.id}" data-duration="${service.duration}" data-price="${service.price}">
        `;

        // Evento para clicar no item e marcar o checkbox
        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                item.classList.toggle('selected', checkbox.checked);
            }
        });
        // Sincronizar clique no checkbox com a classe CSS
        item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
             item.classList.toggle('selected', e.target.checked);
        });

        container.appendChild(item);
    });

    // Botão para avançar 
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn primary-btn';
    nextBtn.textContent = 'Escolher Data';
    nextBtn.addEventListener('click', handleServiceSelection);
    container.appendChild(nextBtn);
}

// Lógica de seleção de serviço e avanço
function handleServiceSelection() {
    const selectedCheckboxes = document.querySelectorAll('#service-list input[type="checkbox"]:checked');
    if (selectedCheckboxes.length === 0) {
        showModal('Atenção', 'Selecione pelo menos um serviço para continuar.', false);
        return;
    }
    
    selectedService = Array.from(selectedCheckboxes).map(cb => {
        const id = parseInt(cb.id.split('-')[1]);
        return SERVICES.find(s => s.id === id);
    });

    goToStep(3); 
    renderCalendar();
}


// =========================================================================
// 4. LÓGICA DE AGENDAMENTO (Regra de Negócio Crucial)
// =========================================================================

// Função principal de Regra de Negócio: Verifica disponibilidade
function getAvailableTimeSlots(dateString, barberId, requiredDuration) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const todayAppointments = appointments.filter(a => 
        a.barberId === barberId && a.date === dateString
    );

    const allSlots = [];
    const { start, end, interval } = BUSINESS_HOURS;

    // Gera todos os slots possíveis no dia
    for (let hour = start; hour < end; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            let slotStart = new Date(`2000/01/01 ${time}`);
            let slotEnd = new Date(slotStart.getTime() + requiredDuration * 60000); 

            // Verifica se o serviço termina antes do horário de fechamento
            if (slotEnd.getHours() > end || (slotEnd.getHours() === end && slotEnd.getMinutes() > 0)) {
                continue; // Pula este slot se o serviço ultrapassar o horário final
            }

            allSlots.push({ time, available: true });
        }
    }

    // Verifica conflito de horário (A lógica mais importante)
    allSlots.forEach(slot => {
        let slotStart = new Date(`2000/01/01 ${slot.time}`);
        let slotEnd = new Date(slotStart.getTime() + requiredDuration * 60000); 

        for (const app of todayAppointments) {
            let appStart = new Date(`2000/01/01 ${app.time}`);
            let appEnd = new Date(appStart.getTime() + app.duration * 60000);
            
            // Conflito ocorre se [SlotStart < AppEnd] E [SlotEnd > AppStart]
            if (slotStart < appEnd && slotEnd > appStart) {
                slot.available = false;
                break;
            }
        }
    });

    return allSlots;
}

// Renderiza o calendário (apenas 7 dias futuros)
function renderCalendar() {
    const container = document.getElementById('calendar');
    container.innerHTML = '';
    document.getElementById('selected-date-display').textContent = 'Selecione uma data';
    document.getElementById('time-slots').innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
        const dateString = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD

        const dayElement = document.createElement('button');
        dayElement.className = 'btn back-btn';
        dayElement.textContent = day;
        dayElement.setAttribute('data-date', dateString);

        dayElement.addEventListener('click', () => {
            // Limpa seleções de data e hora anteriores
            document.querySelectorAll('#calendar button').forEach(btn => btn.classList.remove('primary-btn'));
            dayElement.classList.add('primary-btn');
            selectedTime = null; // Reseta o horário selecionado

            selectedDate = dateString;
            document.getElementById('selected-date-display').textContent = day;
            renderTimeSlots();
        });

        container.appendChild(dayElement);
    }
}

// Renderiza os slots de tempo (Passo 3)
function renderTimeSlots() {
    const container = document.getElementById('time-slots');
    container.innerHTML = '';
    selectedTime = null; 

    if (!selectedDate || !selectedBarber || !selectedService) return;

    const totalDuration = selectedService.reduce((sum, s) => sum + s.duration, 0);

    const slots = getAvailableTimeSlots(selectedDate, selectedBarber.id, totalDuration);

    slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `time-slot ${slot.available ? 'available' : 'unavailable'}`;
        slotElement.textContent = slot.time;
        
        if (slot.available) {
            slotElement.addEventListener('click', () => {
                document.querySelectorAll('.time-slot.selected').forEach(s => s.classList.remove('selected'));
                slotElement.classList.add('selected');
                selectedTime = slot.time;
                updateSummary();
                goToStep(4); // Avança para a Confirmação
            });
        }
        container.appendChild(slotElement);
    });

    if (slots.length === 0 || slots.every(s => !s.available)) {
        container.innerHTML = '<p style="color: red; width: 100%;">Nenhum horário disponível neste dia que acomode a duração do(s) serviço(s). Tente outra data.</p>';
    }
}

// Atualiza o resumo no Passo 4
function updateSummary() {
    const summary = document.getElementById('summary-details');
    const totalDuration = selectedService.reduce((sum, s) => sum + s.duration, 0);
    const totalPrice = selectedService.reduce((sum, s) => sum + s.price, 0);
    const serviceNames = selectedService.map(s => s.name.split('(')[0].trim()).join(', ');

    summary.innerHTML = `
        <p><strong>Barbeiro:</strong> ${selectedBarber.name}</p>
        <p><strong>Serviço(s):</strong> ${serviceNames}</p>
        <p><strong>Duração Total:</strong> ${totalDuration} minutos</p>
        <p><strong>Data:</strong> ${new Date(selectedDate).toLocaleDateString('pt-BR')}</p>
        <p><strong>Horário:</strong> ${selectedTime}</p>
        <p><strong>Valor Estimado:</strong> <span class="highlight">R$ ${totalPrice.toFixed(2)}</span></p>
        <hr style="margin: 15px 0; border-color: #555;">
        <p>Preencha seus dados para finalizar:</p>
    `;
}

// Manipulador do Formulário de Confirmação (Usa o Pop-up)
document.getElementById('confirmation-form').addEventListener('submit', (e) => {
    e.preventDefault();

    if (!selectedBarber || !selectedService || !selectedDate || !selectedTime) {
        showModal('Erro Crítico', 'Algum dado de agendamento está faltando. Por favor, tente novamente.', false);
        return;
    }

    const clientName = document.getElementById('client-name').value;
    const clientEmail = document.getElementById('client-email').value;
    const clientPhone = document.getElementById('client-phone').value;
    const totalDuration = selectedService.reduce((sum, s) => sum + s.duration, 0);

    // Cria o novo agendamento
    const newAppointment = {
        id: Date.now(),
        barberId: selectedBarber.id,
        serviceIds: selectedService.map(s => s.id),
        clientName,
        clientEmail,
        clientPhone,
        date: selectedDate,
        time: selectedTime,
        duration: totalDuration,
        status: 'Confirmado'
    };

    // Salva no LocalStorage
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    appointments.push(newAppointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));

    // Exibe o Pop-up de sucesso
    const finalPrice = selectedService.reduce((sum, s) => sum + s.price, 0).toFixed(2);
    showModal('Agendamento Confirmado! 🤩', 
        `<p>Obrigado, **${clientName}**!</p>
         <p>Seu horário com **${selectedBarber.name}** no dia **${new Date(selectedDate).toLocaleDateString('pt-BR')}** às **${selectedTime}** (R$ ${finalPrice}) foi reservado.</p>
         <p>Você receberá um email de confirmação.</p>`,
        true
    );
});

// =========================================================================
// 5. INICIALIZAÇÃO E EVENTOS GLOBAIS
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initAppointmentsDB();
    renderBarbers();

    // Eventos de Voltar (Back Buttons)
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const targetStep = parseInt(e.target.getAttribute('data-step'));
            goToStep(targetStep);
        });
    });

    // Fechar Modal pelo X ou pelo botão OK
    document.querySelector('.close-btn').addEventListener('click', closeModalAndRestart);
    document.getElementById('modal-ok').addEventListener('click', closeModalAndRestart);

    // Fechar Modal ao clicar fora dele
    window.onclick = function(event) {
        const modal = document.getElementById('modal');
        if (event.target == modal) {
            closeModalAndRestart();
        }
    }
});