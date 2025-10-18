document.addEventListener('DOMContentLoaded', function() {
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
    }

    // Verificar autenticação e carregar dados
    auth.onAuthStateChanged((user) => {
        if (user) {
            inicializarModais();
            carregarDadosInquilino(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
    
    // Carregar dados do inquilino
    function carregarDadosInquilino(uid) {
        database.ref('inquilinos/' + uid).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    dadosInquilino = snapshot.val();
                    exibirDadosInquilino();
                    carregarHistoricoPagamentos(uid);
                } else {
                    console.error('Dados do inquilino não encontrados');
                    alert('Erro ao carregar dados. Entre em contato com o administrador.');
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar dados:', error);
                alert('Erro ao carregar dados. Tente novamente.');
            });
    }
    
    // Exibir dados do inquilino na interface
    function exibirDadosInquilino() {
        document.getElementById('nomeInquilino').textContent = dadosInquilino.nome;
        document.getElementById('enderecoInquilino').textContent = `Rua João Pessoa, 2020 - ${formatarCasa(dadosInquilino.casa)}`;
        document.getElementById('valorAluguel').textContent = dadosInquilino.aluguel.toFixed(2);
        document.getElementById('valorAgua').textContent = dadosInquilino.agua.toFixed(2);
        
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        document.getElementById('valorTotal').textContent = total.toFixed(2);
        document.getElementById('valorPixBasico').textContent = total.toFixed(2);
    }
    
    // Formatar nome da casa para exibição
    function formatarCasa(casa) {
        const formatos = {
            'casa3': 'Casa 3',
            'casa3-101': 'Casa 3/101',
            'casa4': 'Casa 4',
            'casa4-101': 'Casa 4/101'
        };
        return formatos[casa] || casa;
    }
    
    // Carregar histórico de pagamentos
    function carregarHistoricoPagamentos(uid) {
        const corpoTabela = document.getElementById('corpoTabelaPagamentos');
        corpoTabela.innerHTML = '';
        
        database.ref('pagamentos/' + uid).orderByChild('dataSolicitacao').once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const pagamentos = [];
                    
                    snapshot.forEach((childSnapshot) => {
                        const pagamento = childSnapshot.val();
                        pagamento.id = childSnapshot.key;
                        pagamentos.push(pagamento);
                    });
                    
                    // Ordenar por data (mais recente primeiro)
                    pagamentos.sort((a, b) => new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao));
                    
                    pagamentos.forEach((pagamento) => {
                        const linha = document.createElement('tr');
                        
                        let statusClass = '';
                        let statusText = '';
                        
                        if (pagamento.status === 'pago') {
                            statusClass = 'text-success';
                            statusText = 'Pago';
                        } else if (pagamento.status === 'pendente') {
                            statusClass = 'text-warning';
                            statusText = 'Pendente';
                        } else {
                            statusClass = 'text-danger';
                            statusText = 'Em atraso';
                        }
                        
                        const dataPagamento = pagamento.dataPagamento 
                            ? new Date(pagamento.dataPagamento).toLocaleDateString('pt-BR')
                            : '-';
                        
                        linha.innerHTML = `
                            <td>${pagamento.mes}/${pagamento.ano}</td>
                            <td>R$ ${pagamento.valor.toFixed(2)}</td>
                            <td>${dataPagamento}</td>
                            <td>${pagamento.metodo ? pagamento.metodo.charAt(0).toUpperCase() + pagamento.metodo.slice(1) : '-'}</td>
                            <td class="${statusClass} fw-bold">${statusText}</td>
                        `;
                        
                        corpoTabela.appendChild(linha);
                    });
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
    
    // Abrir modal de pagamento
    document.getElementById('btnAbrirModalPagamento').addEventListener('click', function() {
        modalPagamento.show();
    });
    
    // Botão PIX no modal principal
    document.getElementById('btnPix').addEventListener('click', function() {
        metodoPagamentoSelecionado = 'pix';
        document.getElementById('btnPix').classList.add('active');
        document.getElementById('btnDinheiro').classList.remove('active');
        document.getElementById('conteudoPix').classList.remove('d-none');
        document.getElementById('conteudoDinheiro').classList.add('d-none');
        document.getElementById('btnContinuarPagamento').disabled = false;
        document.getElementById('btnContinuarPagamento').textContent = 'Continuar com PIX';
    });
    
    // Botão Dinheiro no modal principal
    document.getElementById('btnDinheiro').addEventListener('click', function() {
        metodoPagamentoSelecionado = 'dinheiro';
        document.getElementById('btnDinheiro').classList.add('active');
        document.getElementById('btnPix').classList.remove('active');
        document.getElementById('conteudoDinheiro').classList.remove('d-none');
        document.getElementById('conteudoPix').classList.add('d-none');
        document.getElementById('btnContinuarPagamento').disabled = false;
        document.getElementById('btnContinuarPagamento').textContent = 'Confirmar Pagamento';
    });
    
    // Botão Continuar no modal principal
    document.getElementById('btnContinuarPagamento').addEventListener('click', function() {
        if (metodoPagamentoSelecionado === 'pix') {
            // Fechar modal principal e abrir modal PIX
            modalPagamento.hide();
            setTimeout(() => {
                gerarPixCompleto();
                modalPix.show();
            }, 300);
        } else if (metodoPagamentoSelecionado === 'dinheiro') {
            registrarPagamento('dinheiro');
            modalPagamento.hide();
        }
    });
    
    // Botão Confirmar no modal PIX
    document.getElementById('btnConfirmarPix').addEventListener('click', function() {
        registrarPagamento('pix');
        modalPix.hide();
    });
    
    // Botão Copiar Código PIX
    document.getElementById('btnCopiarCodigoPix').addEventListener('click', function() {
        const codigoPix = document.getElementById('codigoPixCompleto');
        codigoPix.select();
        codigoPix.setSelectionRange(0, 99999);
        
        navigator.clipboard.writeText(codigoPix.value)
            .then(() => {
                const btn = document.getElementById('btnCopiarCodigoPix');
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check"></i>';
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-success');
                
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-outline-primary');
                }, 2000);
            })
            .catch(err => {
                console.error('Erro ao copiar:', err);
                alert('Erro ao copiar código. Selecione e copie manualmente (Ctrl+C).');
            });
    });
    
    // Resetar modal principal quando fechado
    document.getElementById('modalPagamento').addEventListener('hidden.bs.modal', function () {
        metodoPagamentoSelecionado = '';
        document.getElementById('btnPix').classList.remove('active');
        document.getElementById('btnDinheiro').classList.remove('active');
        document.getElementById('conteudoPix').classList.add('d-none');
        document.getElementById('conteudoDinheiro').classList.add('d-none');
        document.getElementById('btnContinuarPagamento').disabled = true;
    });
    
    // === FUNÇÕES PIX ===
    
    // Função para gerar PIX completo com QR Code
    function gerarPixCompleto() {
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        const data = new Date();
        const mes = data.toLocaleString('pt-BR', { month: 'long' });
        const ano = data.getFullYear();
        const primeiroNome = dadosInquilino.nome.split(' ')[0];
        
        // Criar identificador único
        const identificador = `AluguelJP${primeiroNome}${mes.charAt(0).toUpperCase() + mes.slice(1)}${ano}`;
        
        // Exibir informações no modal
        document.getElementById('valorPixModal').textContent = total.toFixed(2);
        document.getElementById('identificacaoPix').textContent = identificador;
        document.getElementById('dataPix').textContent = data.toLocaleDateString('pt-BR');
        
        // Gerar payload PIX
        const payloadPix = gerarPayloadPix(total, identificador);
        
        // Exibir código PIX
        document.getElementById('codigoPixCompleto').value = payloadPix;
        
        // Gerar QR Code
        const qrDiv = document.getElementById('qrcodePix');
        qrDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Gerando QR Code...</span></div>';
        
        QRCode.toCanvas(qrDiv, payloadPix, { 
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(error) {
            if (error) {
                console.error('Erro ao gerar QR Code:', error);
                qrDiv.innerHTML = '<div class="alert alert-danger p-2">Erro ao gerar QR Code</div>';
            } else {
                console.log('QR Code gerado com sucesso!');
            }
        });
    }
    
    // Função para gerar o payload PIX no formato correto
    function gerarPayloadPix(valor, identificador) {
        const valorCentavos = Math.round(valor * 100);
        const valorFormatado = valorCentavos.toString().padStart(2, '0');
        
        // Montar o payload seguindo o padrão PIX
        const payload = [
            "000201",
            "010212",
            "26",
            "25",
            "0014BR.GOV.BCB.PIX",
            `0111${CONFIG_PIX.chave}`,
            "52040000",
            "5303986",
            `54${valorFormatado.length.toString().padStart(2, '0')}${valorFormatado}`,
            "5802BR",
            `59${CONFIG_PIX.nome.length.toString().padStart(2, '0')}${CONFIG_PIX.nome}`,
            `60${CONFIG_PIX.cidade.length.toString().padStart(2, '0')}${CONFIG_PIX.cidade}`,
            "62",
            `05${identificador.length.toString().padStart(2, '0')}${identificador}`,
            "6304"
        ].join('');
        
        const crc = calcularCRC16(payload);
        return payload + crc;
    }
    
    // Função CRC16 para PIX
    function calcularCRC16(payload) {
        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc = crc << 1;
                }
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }
    
    // === FUNÇÃO REGISTRAR PAGAMENTO ===
    
    function registrarPagamento(metodo) {
        const data = new Date();
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        
        const pagamento = {
            mes: mes,
            ano: ano,
            valor: total,
            metodo: metodo,
            status: 'pendente',
            dataSolicitacao: new Date().toISOString()
        };
        
        const uid = auth.currentUser.uid;
        const novoPagamentoRef = database.ref('pagamentos/' + uid).push();
        
        novoPagamentoRef.set(pagamento)
            .then(() => {
                let mensagem = '✅ Pagamento solicitado com sucesso!\n\nAguarde a confirmação do administrador.';
                if (metodo === 'pix') {
                    mensagem += '\n\n💡 Não esqueça de realizar a transferência PIX.';
                }
                alert(mensagem);
                carregarHistoricoPagamentos(uid);
            })
            .catch((error) => {
                console.error('Erro ao registrar pagamento:', error);
                alert('❌ Erro ao registrar pagamento. Tente novamente.');
            });
    }
});
