document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const database = firebase.database();
    
    let dadosInquilino = {};
    let metodoPagamentoSelecionado = '';
    
    // Verificar autenticação e carregar dados
    auth.onAuthStateChanged((user) => {
        if (user) {
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
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar dados:', error);
            });
    }
    
    // Exibir dados do inquilino na interface
    function exibirDadosInquilino() {
        document.getElementById('nomeInquilino').textContent = dadosInquilino.nome;
        document.getElementById('enderecoInquilino').textContent = `Rua João Pessoa, 2020 - ${dadosInquilino.casa}`;
        document.getElementById('valorAluguel').textContent = dadosInquilino.aluguel.toFixed(2);
        document.getElementById('valorAgua').textContent = dadosInquilino.agua.toFixed(2);
        
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        document.getElementById('valorTotal').textContent = total.toFixed(2);
    }
    
    // Carregar histórico de pagamentos
    function carregarHistoricoPagamentos(uid) {
        const corpoTabela = document.getElementById('corpoTabelaPagamentos');
        corpoTabela.innerHTML = '';
        
        database.ref('pagamentos/' + uid).orderByChild('data').once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const pagamento = childSnapshot.val();
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
                        
                        linha.innerHTML = `
                            <td>${pagamento.mes}/${pagamento.ano}</td>
                            <td>R$ ${pagamento.valor.toFixed(2)}</td>
                            <td>${pagamento.dataPagamento || '-'}</td>
                            <td>${pagamento.metodo || '-'}</td>
                            <td class="${statusClass}">${statusText}</td>
                        `;
                        
                        corpoTabela.appendChild(linha);
                    });
                } else {
                    corpoTabela.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum pagamento registrado</td></tr>';
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar pagamentos:', error);
            });
    }
    
    // Configurar botões de pagamento
    document.getElementById('btnPix').addEventListener('click', function() {
        metodoPagamentoSelecionado = 'pix';
        document.getElementById('btnPix').classList.add('active');
        document.getElementById('btnDinheiro').classList.remove('active');
        document.getElementById('conteudoPix').classList.remove('d-none');
        document.getElementById('conteudoDinheiro').classList.add('d-none');
        document.getElementById('btnConfirmarPagamento').disabled = false;
        
        // Gerar QR Code e código PIX
        gerarPix();
    });
    
    document.getElementById('btnDinheiro').addEventListener('click', function() {
        metodoPagamentoSelecionado = 'dinheiro';
        document.getElementById('btnDinheiro').classList.add('active');
        document.getElementById('btnPix').classList.remove('active');
        document.getElementById('conteudoDinheiro').classList.remove('d-none');
        document.getElementById('conteudoPix').classList.add('d-none');
        document.getElementById('btnConfirmarPagamento').disabled = false;
    });
    
    // Gerar código PIX
    function gerarPix() {
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        const data = new Date();
        const mes = data.toLocaleString('pt-BR', { month: 'long' });
        const ano = data.getFullYear();
        
        // Gerar código PIX dinâmico
        const chavePix = "23198587845"; // Substitua pela sua chave PIX
        const nomeRecebedor = "Renato B de Carvalho";
        const cidadeRecebedor = "Nilopolis";
        const identificador = `AluguelJP${dadosInquilino.nome.split(' ')[0]}${mes.charAt(0).toUpperCase() + mes.slice(1)}${ano}`;
        
        // Montar payload PIX
        const payloadPix = `00020126330014BR.GOV.BCB.PIX0111${chavePix}520400005303986540${total.toFixed(2).replace('.', '').padStart(2, '0')}5802BR5920${nomeRecebedor}6009${cidadeRecebedor}62130509${identificador}6304`;
        
        // Calcular CRC16
        const crc = calcularCRC16(payloadPix);
        const codigoPixCompleto = payloadPix + crc;
        
        // Exibir QR Code
        const qrDiv = document.getElementById('qrcode');
        qrDiv.innerHTML = '';
        QRCode.toCanvas(qrDiv, codigoPixCompleto, { width: 200 }, function(error) {
            if (error) console.error(error);
        });
        
        // Exibir código PIX
        document.getElementById('codigoPix').value = codigoPixCompleto;
        
        // Configurar botão copiar
        document.getElementById('btnCopiarPix').addEventListener('click', function() {
            navigator.clipboard.writeText(codigoPixCompleto)
                .then(() => {
                    alert('Código PIX copiado!');
                })
                .catch(err => {
                    console.error('Erro ao copiar: ', err);
                });
        });
    }
    
    // Calcular CRC16 para PIX
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
    
    // Confirmar pagamento
    document.getElementById('btnConfirmarPagamento').addEventListener('click', function() {
        const data = new Date();
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        const total = dadosInquilino.aluguel + dadosInquilino.agua;
        
        const pagamento = {
            mes: mes,
            ano: ano,
            valor: total,
            metodo: metodoPagamentoSelecionado,
            status: 'pendente',
            dataSolicitacao: new Date().toISOString()
        };
        
        const uid = auth.currentUser.uid;
        const novoPagamentoRef = database.ref('pagamentos/' + uid).push();
        
        novoPagamentoRef.set(pagamento)
            .then(() => {
                alert('Pagamento solicitado! Aguarde a confirmação do administrador.');
                document.querySelector('[data-bs-dismiss="modal"]').click();
                carregarHistoricoPagamentos(uid);
            })
            .catch((error) => {
                console.error('Erro ao registrar pagamento:', error);
                alert('Erro ao registrar pagamento. Tente novamente.');
            });
    });
});
