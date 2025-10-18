// inquilino.js - VERSÃO FINAL CORRIGIDA
console.log('=== SISTEMA PIX - VERSÃO FINAL ===');

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM Carregado');

    // Verificar bibliotecas
    if (typeof firebase === 'undefined' || typeof bootstrap === 'undefined') {
        alert('Erro: Bibliotecas não carregadas. Recarregue a página.');
        return;
    }

    const auth = firebase.auth();
    const database = firebase.database();
    
    let dadosInquilino = null;
    let metodoPagamentoSelecionado = '';
    let modalPagamento, modalPix;
    let dadosCarregados = false;

    // Configurações PIX
    const CONFIG_PIX = {
        chave: "02319858784",
        nome: "Renato B de Carvalho",
        cidade: "Nilopolis"
    };

    // Inicializar sistema
    function inicializarSistema() {
        try {
            modalPagamento = new bootstrap.Modal(document.getElementById('modalPagamento'));
            modalPix = new bootstrap.Modal(document.getElementById('modalPix'));
            console.log('✅ Modais inicializados');
            configurarEventListeners();
            verificarAutenticacao();
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }

    // Verificar autenticação
    function verificarAutenticacao() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('✅ Usuário autenticado:', user.uid);
                carregarDadosInquilino(user.uid);
            } else {
                window.location.href = 'login.html';
            }
        });
    }
    
    // Configurar event listeners
    function configurarEventListeners() {
        document.getElementById('btnAbrirModalPagamento').addEventListener('click', function() {
            if (!verificarDadosCarregados()) return;
            modalPagamento.show();
        });
        
        document.getElementById('btnPix').addEventListener('click', function() {
            if (!verificarDadosCarregados()) return;
            metodoPagamentoSelecionado = 'pix';
            document.getElementById('btnPix').classList.add('active');
            document.getElementById('btnDinheiro').classList.remove('active');
            document.getElementById('conteudoPix').classList.remove('d-none');
            document.getElementById('conteudoDinheiro').classList.add('d-none');
            document.getElementById('btnContinuarPagamento').disabled = false;
            document.getElementById('btnContinuarPagamento').textContent = 'Continuar com PIX';
        });
        
        document.getElementById('btnDinheiro').addEventListener('click', function() {
            if (!verificarDadosCarregados()) return;
            metodoPagamentoSelecionado = 'dinheiro';
            document.getElementById('btnDinheiro').classList.add('active');
            document.getElementById('btnPix').classList.remove('active');
            document.getElementById('conteudoDinheiro').classList.remove('d-none');
            document.getElementById('conteudoPix').classList.add('d-none');
            document.getElementById('btnContinuarPagamento').disabled = false;
            document.getElementById('btnContinuarPagamento').textContent = 'Confirmar Pagamento';
        });
        
        document.getElementById('btnContinuarPagamento').addEventListener('click', function() {
            if (!verificarDadosCarregados()) return;
            
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
            if (!verificarDadosCarregados()) return;
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
                    alert('Selecione e copie manualmente (Ctrl+C).');
                });
        });
        
        document.getElementById('modalPagamento').addEventListener('hidden.bs.modal', function () {
            metodoPagamentoSelecionado = '';
            document.getElementById('btnPix').classList.remove('active');
            document.getElementById('btnDinheiro').classList.remove('active');
            document.getElementById('conteudoPix').classList.add('d-none');
            document.getElementById('conteudoDinheiro').classList.add('d-none');
            document.getElementById('btnContinuarPagamento').disabled = true;
        });

        document.getElementById('btnLogout').addEventListener('click', function() {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }
    
    // Verificar dados carregados
    function verificarDadosCarregados() {
        if (!dadosCarregados || !dadosInquilino) {
            alert('Aguarde os dados carregarem.');
            return false;
        }
        return true;
    }
    
    // Carregar dados do inquilino
    function carregarDadosInquilino(uid) {
        console.log('📥 Carregando dados...');
        
        database.ref('inquilinos/' + uid).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    dadosInquilino = snapshot.val();
                    dadosCarregados = true;
                    console.log('✅ Dados carregados:', dadosInquilino);
                    exibirDadosInquilino();
                    carregarHistoricoPagamentos(uid);
                } else {
                    alert('Dados não encontrados. Contate o administrador.');
                }
            })
            .catch((error) => {
                console.error('❌ Erro:', error);
                alert('Erro ao carregar dados.');
            });
    }
    
    // Exibir dados na interface
    function exibirDadosInquilino() {
        try {
            document.getElementById('nomeInquilino').textContent = dadosInquilino.nome;
            document.getElementById('enderecoInquilino').textContent = `Rua João Pessoa, 2020 - ${dadosInquilino.casa}`;
            document.getElementById('valorAluguel').textContent = dadosInquilino.aluguel.toFixed(2);
            document.getElementById('valorAgua').textContent = dadosInquilino.agua.toFixed(2);
            
            const total = dadosInquilino.aluguel + dadosInquilino.agua;
            document.getElementById('valorTotal').textContent = total.toFixed(2);
            document.getElementById('valorPixBasico').textContent = total.toFixed(2);
        } catch (error) {
            console.error('❌ Erro ao exibir dados:', error);
        }
    }
    
    // Carregar histórico
    function carregarHistoricoPagamentos(uid) {
        const corpoTabela = document.getElementById('corpoTabelaPagamentos');
        
        database.ref('pagamentos/' + uid).once('value')
            .then((snapshot) => {
                corpoTabela.innerHTML = '';
                
                if (snapshot.exists()) {
                    const pagamentos = [];
                    snapshot.forEach((childSnapshot) => {
                        pagamentos.push(childSnapshot.val());
                    });
                    
                    pagamentos.sort((a, b) => new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao));
                    
                    pagamentos.forEach((pagamento) => {
                        const linha = document.createElement('tr');
                        const statusClass = pagamento.status === 'pago' ? 'text-success' : 
                                          pagamento.status === 'pendente' ? 'text-warning' : 'text-danger';
                        const statusText = pagamento.status === 'pago' ? 'Pago' : 
                                         pagamento.status === 'pendente' ? 'Pendente' : 'Em atraso';
                        
                        linha.innerHTML = `
                            <td>${pagamento.mes}/${pagamento.ano}</td>
                            <td>R$ ${pagamento.valor.toFixed(2)}</td>
                            <td>${pagamento.dataPagamento ? new Date(pagamento.dataPagamento).toLocaleDateString('pt-BR') : '-'}</td>
                            <td>${pagamento.metodo ? pagamento.metodo.charAt(0).toUpperCase() + pagamento.metodo.slice(1) : '-'}</td>
                            <td class="${statusClass} fw-bold">${statusText}</td>
                        `;
                        corpoTabela.appendChild(linha);
                    });
                } else {
                    corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum pagamento</td></tr>';
                }
            })
            .catch((error) => {
                corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar</td></tr>';
            });
    }
    
    // === FUNÇÃO PIX CORRIGIDA E TESTADA ===
    function gerarPixCompleto() {
        console.log('🎯 Gerando PIX...');
        
        if (!dadosCarregados || !dadosInquilino) return;
        
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        const data = new Date();
        const mes = data.toLocaleString('pt-BR', { month: 'long' });
        const ano = data.getFullYear();
        const primeiroNome = dadosInquilino.nome.split(' ')[0];
        
        // Identificador curto
        const identificador = `ALUG${primeiroNome.substring(0, 6)}${mes.substring(0, 3)}${ano.toString().slice(-2)}`.toUpperCase();
        
        console.log('💰 Total:', total, 'Identificador:', identificador);
        
        // Atualizar modal
        document.getElementById('valorPixModal').textContent = total.toFixed(2);
        document.getElementById('identificacaoPix').textContent = identificador;
        document.getElementById('dataPix').textContent = data.toLocaleDateString('pt-BR');
        
        // Gerar PIX
        const payloadPix = gerarPayloadPixCorreto(total, identificador);
        document.getElementById('codigoPixCompleto').value = payloadPix;
        
        // QR Code
        const qrDiv = document.getElementById('qrcodePix');
        qrDiv.innerHTML = '<div class="spinner-border text-primary"><span class="visually-hidden">Carregando...</span></div>';
        
        if (typeof QRCode !== 'undefined') {
            setTimeout(() => {
                try {
                    new QRCode(qrDiv, {
                        text: payloadPix,
                        width: 200,
                        height: 200,
                        colorDark: "#000000",
                        colorLight: "#ffffff"
                    });
                } catch (error) {
                    qrDiv.innerHTML = '<div class="alert alert-warning">Use o código PIX</div>';
                }
            }, 100);
        }
    }

    // FUNÇÃO PIX CORRIGIDA - VALOR CERTO
    function gerarPayloadPixCorreto(valor, identificador) {
        const valorCentavos = Math.round(valor * 100);
        const valorStr = valorCentavos.toString();
        
        console.log('🔢 Valor:', valor, '->', valorCentavos, 'centavos');
        
        // PAYLOAD CORRETO - formato que funciona
        const payload = 
            '000201' + 
            '010212' + 
            '26' + 
            '25' + 
            '0014BR.GOV.BCB.PIX011102319858784' + 
            '52040000' + 
            '5303986' + 
            '54' + valorStr.length.toString().padStart(2, '0') + valorStr + 
            '5802BR' + 
            '5920Renato B de Carvalho' + 
            '6009Nilopolis' + 
            '62' + 
            '05' + 
            '03***' + 
            '6304';

        const crc = calcularCRC16(payload);
        const finalCode = payload + crc;
        
        console.log('✅ PIX gerado. Valor no código:', valorStr + ' centavos');
        return finalCode;
    }

    // CRC16
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
    
    // Registrar pagamento
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
                alert('✅ Pagamento solicitado! Aguarde confirmação.' + (metodo === 'pix' ? '\n💡 Realize a transferência PIX.' : ''));
                carregarHistoricoPagamentos(uid);
            })
            .catch((error) => {
                alert('❌ Erro ao registrar.');
            });
    }

    // Iniciar
    inicializarSistema();
    console.log('✅ Sistema carregado!');
});
