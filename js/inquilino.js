// inquilino.js - Versão COMPLETA com Sistema de Contas Flexíveis
console.log('=== INICIANDO SISTEMA PIX COM CONTAS FLEXÍVEIS ===');

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM Carregado');

    // Verificar se bibliotecas essenciais estão carregadas
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase não carregado!');
        alert('Erro: Firebase não carregado. Recarregue a página.');
        return;
    }
    
    if (typeof bootstrap === 'undefined') {
        console.error('❌ Bootstrap não carregado!');
        alert('Erro: Bootstrap não carregado. Recarregue a página.');
        return;
    }

    const auth = firebase.auth();
    const database = firebase.database();
    
    let dadosInquilino = null;
    let metodoPagamentoSelecionado = '';
    let modalPagamento, modalPix;
    let dadosCarregados = false;

    // Configurações PIX - Dados reais do beneficiário
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
            
            // Configurar event listeners
            configurarEventListeners();
            
            // Verificar autenticação
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
                console.log('❌ Usuário não autenticado, redirecionando...');
                window.location.href = 'login.html';
            }
        });
    }
    
    // Configurar event listeners
    function configurarEventListeners() {
        // Abrir modal de pagamento
        document.getElementById('btnAbrirModalPagamento').addEventListener('click', function() {
            console.log('🔄 Abrindo modal de pagamento');
            if (!verificarDadosCarregados()) return;
            modalPagamento.show();
        });
        
        // Botão PIX no modal principal
        document.getElementById('btnPix').addEventListener('click', function() {
            console.log('🎯 PIX selecionado');
            if (!verificarDadosCarregados()) return;
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
            console.log('💵 Dinheiro selecionado');
            if (!verificarDadosCarregados()) return;
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
            console.log('🔄 Continuando pagamento:', metodoPagamentoSelecionado);
            
            if (!verificarDadosCarregados()) return;
            
            if (metodoPagamentoSelecionado === 'pix') {
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
            console.log('✅ Confirmando pagamento PIX');
            if (!verificarDadosCarregados()) return;
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
                    console.error('❌ Erro ao copiar:', err);
                    alert('Erro ao copiar código. Selecione e copie manualmente (Ctrl+C).');
                });
        });
        
        // Resetar modal principal quando fechado
        document.getElementById('modalPagamento').addEventListener('hidden.bs.modal', function () {
            console.log('🔄 Modal principal fechado, resetando...');
            metodoPagamentoSelecionado = '';
            document.getElementById('btnPix').classList.remove('active');
            document.getElementById('btnDinheiro').classList.remove('active');
            document.getElementById('conteudoPix').classList.add('d-none');
            document.getElementById('conteudoDinheiro').classList.add('d-none');
            document.getElementById('btnContinuarPagamento').disabled = true;
        });

        // Logout
        document.getElementById('btnLogout').addEventListener('click', function() {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }
    
    // Verificar se os dados foram carregados
    function verificarDadosCarregados() {
        if (!dadosCarregados || !dadosInquilino) {
            console.error('❌ Dados não carregados!');
            alert('❌ Aguarde os dados carregarem antes de continuar.');
            return false;
        }
        return true;
    }
    
    // Carregar dados do inquilino
    function carregarDadosInquilino(uid) {
        console.log('📥 Carregando dados do inquilino:', uid);
        
        database.ref('inquilinos/' + uid).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    dadosInquilino = snapshot.val();
                    dadosCarregados = true;
                    console.log('✅ Dados carregados:', dadosInquilino);
                    exibirDadosInquilino();
                    carregarHistoricoPagamentos(uid);
                } else {
                    console.error('❌ Dados do inquilino não encontrados para UID:', uid);
                    alert('❌ Erro: Seus dados não foram encontrados. Entre em contato com o administrador.');
                }
            })
            .catch((error) => {
                console.error('❌ Erro ao carregar dados:', error);
                alert('❌ Erro ao carregar dados. Tente novamente.');
            });
    }
    
    // === FUNÇÃO: Calcular total para PIX ===
    function calcularTotalPix() {
        if (!dadosInquilino) return 0;
        
        let total = dadosInquilino.aluguel || 0;
        
        // Adicionar contas que pagam junto
        if (dadosInquilino.contas) {
            if (dadosInquilino.contas.agua?.pagaJunto !== false) {
                total += dadosInquilino.contas.agua?.valor || 0;
            }
            if (dadosInquilino.contas.luz?.pagaJunto === true) {
                total += dadosInquilino.contas.luz?.valor || 0;
            }
        } else {
            // Compatibilidade com dados antigos
            total += dadosInquilino.agua || 0;
        }
        
        return total;
    }
    
    // === FUNÇÃO: Exibir dados do inquilino na interface ===
    function exibirDadosInquilino() {
        try {
            if (!dadosInquilino) {
                console.error('❌ Dados do inquilino não disponíveis para exibição');
                return;
            }
            
            document.getElementById('nomeInquilino').textContent = dadosInquilino.nome || 'Não informado';
            document.getElementById('enderecoInquilino').textContent = `Rua João Pessoa, 2020 - ${formatarCasa(dadosInquilino.casa)}`;
            document.getElementById('valorAluguel').textContent = (dadosInquilino.aluguel || 0).toFixed(2);
            
            // Processar contas (compatibilidade com dados antigos e novos)
            let valorAgua = 0;
            let valorLuz = 0;
            let aguaJunto = true;
            let luzJunto = false;
            
            if (dadosInquilino.contas) {
                // Nova estrutura com contas separadas
                valorAgua = dadosInquilino.contas.agua?.valor || 0;
                valorLuz = dadosInquilino.contas.luz?.valor || 0;
                aguaJunto = dadosInquilino.contas.agua?.pagaJunto !== false;
                luzJunto = dadosInquilino.contas.luz?.pagaJunto === true;
            } else {
                // Estrutura antiga (apenas água)
                valorAgua = dadosInquilino.agua || 0;
            }
            
            // Exibir valores na interface
            document.getElementById('valorAgua').textContent = valorAgua.toFixed(2);
            document.getElementById('valorLuz').textContent = valorLuz.toFixed(2);
            
            // Calcular total para PIX (apenas contas que pagam junto)
            const totalPix = calcularTotalPix();
            
            document.getElementById('valorTotal').textContent = totalPix.toFixed(2);
            document.getElementById('valorPixBasico').textContent = totalPix.toFixed(2);
            
            console.log('✅ Dados exibidos na interface', { 
                aluguel: dadosInquilino.aluguel,
                agua: valorAgua, 
                luz: valorLuz,
                aguaJunto: aguaJunto,
                luzJunto: luzJunto,
                totalPix: totalPix
            });
            
        } catch (error) {
            console.error('❌ Erro ao exibir dados:', error);
        }
    }
    
    // Formatar nome da casa para exibição
    function formatarCasa(casa) {
        const formatos = {
            'casa3': 'Casa 3',
            'casa3-101': 'Casa 3/101',
            'casa4': 'Casa 4',
            'casa4-101': 'Casa 4/101'
        };
        return formatos[casa] || casa || 'Não informada';
    }
    
    // Carregar histórico de pagamentos
    function carregarHistoricoPagamentos(uid) {
        const corpoTabela = document.getElementById('corpoTabelaPagamentos');
        corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>';
        
        database.ref('pagamentos/' + uid).orderByChild('dataSolicitacao').once('value')
            .then((snapshot) => {
                corpoTabela.innerHTML = '';
                
                if (snapshot.exists()) {
                    const pagamentos = [];
                    
                    snapshot.forEach((childSnapshot) => {
                        const pagamento = childSnapshot.val();
                        pagamento.id = childSnapshot.key;
                        pagamentos.push(pagamento);
                    });
                    
                    // Ordenar por data (mais recente primeiro)
                    pagamentos.sort((a, b) => new Date(b.dataSolicitacao) - new Date(a.dataSolicitacao));
                    
                    if (pagamentos.length === 0) {
                        corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum pagamento registrado</td></tr>';
                        return;
                    }
                    
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
                            <td>R$ ${(pagamento.valor || 0).toFixed(2)}</td>
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
                console.error('❌ Erro ao carregar pagamentos:', error);
                corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar pagamentos</td></tr>';
            });
    }
    
    // === FUNÇÕES PIX CORRIGIDAS ===
    
    function gerarPixCompleto() {
        console.log('🎯 Gerando PIX completo...');
        
        // Verificação robusta dos dados
        if (!dadosCarregados || !dadosInquilino) {
            console.error('❌ Dados do inquilino não disponíveis');
            alert('❌ Erro: Dados não carregados. Aguarde um momento e tente novamente.');
            return;
        }
        
        if (!dadosInquilino.nome) {
            console.error('❌ Nome do inquilino não disponível');
            alert('❌ Erro: Nome do inquilino não encontrado.');
            return;
        }
        
        const total = calcularTotalPix();
        const data = new Date();
        const mes = data.toLocaleString('pt-BR', { month: 'long' });
        const ano = data.getFullYear();
        const primeiroNome = dadosInquilino.nome.split(' ')[0];
        
        // IDENTIFICADOR CURTO - máximo 15 caracteres
        const identificador = `ALUGUEL_${primeiroNome.substring(0, 10)}_${mes.substring(0, 3)}${ano.toString().slice(-2)}`.toUpperCase();
        
        console.log('📊 Dados PIX:', { 
            total, 
            identificador, 
            primeiroNome,
            'tamanho_identificador': identificador.length 
        });
        
        // Exibir informações no modal
        document.getElementById('valorPixModal').textContent = total.toFixed(2);
        document.getElementById('identificacaoPix').textContent = identificador;
        document.getElementById('dataPix').textContent = data.toLocaleDateString('pt-BR');
        
        // Gerar payload PIX CORRETO
        const payloadPix = gerarPayloadPixCorreto(total, identificador);
        console.log('📦 Payload PIX gerado:', payloadPix);
        
        // Exibir código PIX
        document.getElementById('codigoPixCompleto').value = payloadPix;
        
        // Gerar QR Code
        const qrDiv = document.getElementById('qrcodePix');
        qrDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Gerando QR Code...</span></div>';
        
        // Tentar gerar QR Code
        setTimeout(() => {
            gerarQRCode(qrDiv, payloadPix);
        }, 100);
    }
    
    function gerarQRCode(qrDiv, payloadPix) {
        // Método 1: Usando QRCode (qrcode.js)
        if (typeof QRCode !== 'undefined') {
            console.log('✅ Usando QRCode (qrcode.js)');
            try {
                // Limpar o div primeiro
                qrDiv.innerHTML = '';
                
                // Criar nova instância do QRCode
                new QRCode(qrDiv, {
                    text: payloadPix,
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                console.log('✅ QR Code gerado com sucesso usando QRCode!');
                return;
            } catch (error) {
                console.error('❌ Erro no QRCode:', error);
            }
        }
        
        // Método 2: Fallback
        console.log('⚠️ Nenhuma biblioteca QRCode disponível, usando fallback');
        mostrarFallbackQRCode(qrDiv);
    }
    
    function mostrarFallbackQRCode(qrDiv) {
        qrDiv.innerHTML = `
            <div class="alert alert-warning text-center p-3">
                <i class="bi bi-qr-code fs-1"></i><br>
                <strong>QR Code Indisponível</strong><br>
                <small>Use o código PIX copiável ao lado</small>
            </div>
        `;
    }
    
    // FUNÇÃO CORRIGIDA PARA GERAR PIX VÁLIDO
    function gerarPayloadPixCorreto(valor, identificador) {
        // Configurações PIX fixas
        const CONFIG_PIX = {
            chave: "02319858784", // sua chave PIX
            nome: "Renato B de Carvalho",
            cidade: "Nilopolis"
        };

        // Valor formatado (ex: 850.00)
        const valorFormatado = valor.toFixed(2);

        // Garante que o TXID (identificador) tenha no máximo 25 caracteres
        const txid = (identificador || "SEMID")
            .replace(/[^A-Z0-9]/gi, '') // remove caracteres inválidos
            .substring(0, 25);

        // === Montagem dos campos ===
        const payload =
            '000201' +                 // Início
            '010212' +                 // QR estático
            '26330014BR.GOV.BCB.PIX' + // Domínio oficial do BACEN
            '0111' + CONFIG_PIX.chave + // 01 = chave, 11 = tamanho, valor = chave
            '52040000' +               // Categoria
            '5303986' +                // Moeda BRL
            '54' + String(valorFormatado.length).padStart(2, '0') + valorFormatado + // Valor
            '5802BR' +                 // País
            '59' + String(CONFIG_PIX.nome.length).padStart(2, '0') + CONFIG_PIX.nome + // Nome recebedor
            '60' + String(CONFIG_PIX.cidade.length).padStart(2, '0') + CONFIG_PIX.cidade; // Cidade

        // === Campo adicional (TXID dinâmico) ===
        const campoAdicional = '05' + String(txid.length).padStart(2, '0') + txid;
        const campo62 = '62' + String(campoAdicional.length).padStart(2, '0') + campoAdicional;

        // === Montar payload completo antes do CRC ===
        const payloadCompleto = payload + campo62 + '6304';

        // === Calcular CRC16 ===
        const crc = calcularCRC16(payloadCompleto);

        return payloadCompleto + crc;
    }

    // FUNÇÃO CRC16 CORRIGIDA E TESTADA
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
            crc &= 0xFFFF; // Manter 16 bits
        }
        
        const result = crc.toString(16).toUpperCase().padStart(4, '0');
        console.log('🔢 CRC16 calculado:', result, 'para payload length:', payload.length);
        return result;
    }
    
    function registrarPagamento(metodo) {
        console.log('💾 Registrando pagamento:', metodo);
        
        if (!verificarDadosCarregados()) return;
        
        const data = new Date();
        const total = calcularTotalPix();
        
        const pagamento = {
            mes: data.getMonth() + 1,
            ano: data.getFullYear(),
            valor: total,
            metodo: metodo,
            status: 'pendente',
            dataSolicitacao: new Date().toISOString(),
            tipo: 'aluguel_com_contas' // Novo campo para identificar tipo de pagamento
        };
        
        const uid = auth.currentUser.uid;
        database.ref('pagamentos/' + uid).push(pagamento)
            .then(() => {
                let mensagem = '✅ Pagamento solicitado com sucesso!\n\nAguarde a confirmação do administrador.';
                if (metodo === 'pix') {
                    mensagem += '\n\n💡 Não esqueça de realizar a transferência PIX.';
                }
                alert(mensagem);
                carregarHistoricoPagamentos(uid);
            })
            .catch((error) => {
                console.error('❌ Erro ao registrar pagamento:', error);
                alert('❌ Erro ao registrar pagamento. Tente novamente.');
            });
    }

    // Iniciar o sistema
    inicializarSistema();
    console.log('✅ Sistema PIX com contas flexíveis inicializado!');
});
