// inquilino.js - Versão Corrigida
console.log('=== INICIANDO SISTEMA PIX ===');

// Verificar se QRCode está disponível
if (typeof QRCode === 'undefined') {
    console.error('❌ QRCode não está disponível!');
    // Carregar fallback
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    script.onload = function() {
        console.log('✅ QRCode carregado via fallback');
        iniciarSistema();
    };
    document.head.appendChild(script);
} else {
    console.log('✅ QRCode já está carregado');
    iniciarSistema();
}

function iniciarSistema() {
    console.log('✅ Iniciando sistema...');
    
    const auth = firebase.auth();
    const database = firebase.database();
    
    let dadosInquilino = {};
    let metodoPagamentoSelecionado = '';
    let modalPagamento, modalPix;

    // Configurações PIX
    const CONFIG_PIX = {
        chave: "23198587845",
        nome: "Renato B de Carvalho",
        cidade: "Nilopolis"
    };

    // Inicializar modais
    function inicializarModais() {
        modalPagamento = new bootstrap.Modal(document.getElementById('modalPagamento'));
        modalPix = new bootstrap.Modal(document.getElementById('modalPix'));
        console.log('✅ Modais inicializados');
    }

    // Verificar autenticação e carregar dados
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ Usuário autenticado:', user.uid);
            inicializarModais();
            carregarDadosInquilino(user.uid);
        } else {
            console.log('❌ Usuário não autenticado');
            window.location.href = 'login.html';
        }
    });
    
    // Carregar dados do inquilino
    function carregarDadosInquilino(uid) {
        console.log('📥 Carregando dados do inquilino...');
        database.ref('inquilinos/' + uid).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    dadosInquilino = snapshot.val();
                    console.log('✅ Dados carregados:', dadosInquilino);
                    exibirDadosInquilino();
                    carregarHistoricoPagamentos(uid);
                } else {
                    console.error('❌ Dados não encontrados');
                    alert('Erro ao carregar dados.');
                }
            })
            .catch((error) => {
                console.error('❌ Erro ao carregar dados:', error);
                alert('Erro ao carregar dados.');
            });
    }
    
    // Exibir dados do inquilino
    function exibirDadosInquilino() {
        document.getElementById('nomeInquilino').textContent = dadosInquilino.nome;
        document.getElementById('enderecoInquilino').textContent = `Rua João Pessoa, 2020 - ${dadosInquilino.casa}`;
        document.getElementById('valorAluguel').textContent = dadosInquilino.aluguel.toFixed(2);
        document.getElementById('valorAgua').textContent = dadosInquilino.agua.toFixed(2);
        
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        document.getElementById('valorTotal').textContent = total.toFixed(2);
        document.getElementById('valorPixBasico').textContent = total.toFixed(2);
    }
    
    // Carregar histórico de pagamentos
    function carregarHistoricoPagamentos(uid) {
        const corpoTabela = document.getElementById('corpoTabelaPagamentos');
        database.ref('pagamentos/' + uid).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const pagamentos = [];
                    snapshot.forEach((childSnapshot) => {
                        pagamentos.push(childSnapshot.val());
                    });
                    
                    pagamentos.sort((a, b) => new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao));
                    
                    corpoTabela.innerHTML = pagamentos.map(pagamento => `
                        <tr>
                            <td>${pagamento.mes}/${pagamento.ano}</td>
                            <td>R$ ${pagamento.valor.toFixed(2)}</td>
                            <td>${pagamento.dataPagamento ? new Date(pagamento.dataPagamento).toLocaleDateString('pt-BR') : '-'}</td>
                            <td>${pagamento.metodo ? pagamento.metodo.charAt(0).toUpperCase() + pagamento.metodo.slice(1) : '-'}</td>
                            <td class="fw-bold ${
                                pagamento.status === 'pago' ? 'text-success' : 
                                pagamento.status === 'pendente' ? 'text-warning' : 'text-danger'
                            }">
                                ${pagamento.status === 'pago' ? 'Pago' : 
                                  pagamento.status === 'pendente' ? 'Pendente' : 'Em atraso'}
                            </td>
                        </tr>
                    `).join('');
                } else {
                    corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum pagamento registrado</td></tr>';
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar pagamentos:', error);
                corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar pagamentos</td></tr>';
            });
    }
    
    // === EVENT LISTENERS ===
    
    document.getElementById('btnAbrirModalPagamento').addEventListener('click', function() {
        console.log('🔄 Abrindo modal de pagamento');
        modalPagamento.show();
    });
    
    document.getElementById('btnPix').addEventListener('click', function() {
        metodoPagamentoSelecionado = 'pix';
        document.getElementById('btnPix').classList.add('active');
        document.getElementById('btnDinheiro').classList.remove('active');
        document.getElementById('conteudoPix').classList.remove('d-none');
        document.getElementById('conteudoDinheiro').classList.add('d-none');
        document.getElementById('btnContinuarPagamento').disabled = false;
        document.getElementById('btnContinuarPagamento').textContent = 'Continuar com PIX';
    });
    
    document.getElementById('btnDinheiro').addEventListener('click', function() {
        metodoPagamentoSelecionado = 'dinheiro';
        document.getElementById('btnDinheiro').classList.add('active');
        document.getElementById('btnPix').classList.remove('active');
        document.getElementById('conteudoDinheiro').classList.remove('d-none');
        document.getElementById('conteudoPix').classles.add('d-none');
        document.getElementById('btnContinuarPagamento').disabled = false;
        document.getElementById('btnContinuarPagamento').textContent = 'Confirmar Pagamento';
    });
    
    document.getElementById('btnContinuarPagamento').addEventListener('click', function() {
        console.log('🔄 Continuando para:', metodoPagamentoSelecionado);
        
        if (metodoPagamentoSelecionado === 'pix') {
            modalPagamento.hide();
            setTimeout(() => {
                gerarPixCompleto();
                modalPix.show();
            }, 300);
        } else {
            registrarPagamento('dinheiro');
            modalPagamento.hide();
        }
    });
    
    document.getElementById('btnConfirmarPix').addEventListener('click', function() {
        registrarPagamento('pix');
        modalPix.hide();
    });
    
    document.getElementById('btnCopiarCodigoPix').addEventListener('click', function() {
        const codigoPix = document.getElementById('codigoPixCompleto');
        codigoPix.select();
        navigator.clipboard.writeText(codigoPix.value)
            .then(() => {
                const btn = this;
                btn.innerHTML = '<i class="bi bi-check"></i>';
                btn.classList.replace('btn-outline-primary', 'btn-success');
                setTimeout(() => {
                    btn.innerHTML = '<i class="bi bi-clipboard"></i>';
                    btn.classList.replace('btn-success', 'btn-outline-primary');
                }, 2000);
            })
            .catch(() => {
                alert('Selecione e copie manualmente (Ctrl+C)');
            });
    });
    
    // Resetar modal principal
    document.getElementById('modalPagamento').addEventListener('hidden.bs.modal', function() {
        metodoPagamentoSelecionado = '';
        document.getElementById('btnPix').classList.remove('active');
        document.getElementById('btnDinheiro').classList.remove('active');
        document.getElementById('conteudoPix').classList.add('d-none');
        document.getElementById('conteudoDinheiro').classList.add('d-none');
        document.getElementById('btnContinuarPagamento').disabled = true;
    });
    
    // === FUNÇÃO PIX SIMPLIFICADA ===
    
    function gerarPixCompleto() {
        console.log('🎯 Gerando PIX...');
        
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        const data = new Date();
        const mes = data.toLocaleString('pt-BR', { month: 'long' });
        const ano = data.getFullYear();
        const primeiroNome = dadosInquilino.nome.split(' ')[0];
        const identificador = `AluguelJP${primeiroNome}${mes.charAt(0).toUpperCase() + mes.slice(1)}${ano}`;
        
        console.log('📊 Dados PIX:', { total, identificador });
        
        // Atualizar informações
        document.getElementById('valorPixModal').textContent = total.toFixed(2);
        document.getElementById('identificacaoPix').textContent = identificador;
        document.getElementById('dataPix').textContent = data.toLocaleDateString('pt-BR');
        
        // Gerar payload
        const payloadPix = gerarPayloadPix(total, identificador);
        document.getElementById('codigoPixCompleto').value = payloadPix;
        
        // Gerar QR Code
        const qrDiv = document.getElementById('qrcodePix');
        qrDiv.innerHTML = '<div class="spinner-border text-primary"><span class="visually-hidden">Gerando QR Code...</span></div>';
        
        console.log('🔄 Gerando QR Code...');
        
        // USAR A BIBLIOTECA QRCode CORRETAMENTE
        try {
            QRCode.toCanvas(qrDiv, payloadPix, { 
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            }, function(error) {
                if (error) {
                    console.error('❌ Erro QRCode:', error);
                    qrDiv.innerHTML = `
                        <div class="alert alert-warning text-center">
                            <i class="bi bi-exclamation-triangle"></i><br>
                            Use o código PIX abaixo
                        </div>
                    `;
                } else {
                    console.log('✅ QR Code gerado!');
                }
            });
        } catch (error) {
            console.error('❌ Erro na geração:', error);
            qrDiv.innerHTML = `
                <div class="alert alert-warning text-center">
                    <i class="bi bi-info-circle"></i><br>
                    Use o código PIX copiável
                </div>
            `;
        }
    }
    
    function gerarPayloadPix(valor, identificador) {
        const valorCentavos = Math.round(valor * 100).toString();
        
        // Payload PIX simplificado mas funcional
        const payload = [
            '000201',
            '010212',
            '26', '25', '0014BR.GOV.BCB.PIX0111' + CONFIG_PIX.chave,
            '52040000',
            '5303986',
            '54' + valorCentavos.length.toString().padStart(2, '0') + valorCentavos,
            '5802BR',
            '59' + CONFIG_PIX.nome.length.toString().padStart(2, '0') + CONFIG_PIX.nome,
            '60' + CONFIG_PIX.cidade.length.toString().padStart(2, '0') + CONFIG_PIX.cidade,
            '62', '05' + identificador.length.toString().padStart(2, '0') + identificador,
            '6304'
        ].join('');
        
        return payload + calcularCRC16(payload);
    }
    
    function calcularCRC16(payload) {
        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }
    
    function registrarPagamento(metodo) {
        const data = new Date();
        const pagamento = {
            mes: data.getMonth() + 1,
            ano: data.getFullYear(),
            valor: dadosInquilino.aluguel + dadosInquilino.agua,
            metodo: metodo,
            status: 'pendente',
            dataSolicitacao: new Date().toISOString()
        };
        
        const uid = auth.currentUser.uid;
        database.ref('pagamentos/' + uid).push(pagamento)
            .then(() => {
                alert('✅ Pagamento solicitado! Aguarde confirmação.');
                carregarHistoricoPagamentos(uid);
            })
            .catch((error) => {
                console.error('Erro:', error);
                alert('❌ Erro ao registrar pagamento.');
            });
    }
}
