document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const database = firebase.database();
    
    // Login do administrador (simplificado para demonstração)
    // Em um sistema real, você teria uma autenticação separada para admin
    
    // Carregar lista de inquilinos
    function carregarInquilinos() {
        const tabela = document.getElementById('tabelaInquilinos');
        tabela.innerHTML = '';
        
        database.ref('inquilinos').once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const inquilino = childSnapshot.val();
                        const uid = childSnapshot.key;
                        
                        const linha = document.createElement('tr');
                        linha.innerHTML = `
                            <td>${inquilino.nome}</td>
                            <td>${inquilino.cpf}</td>
                            <td>${inquilino.casa}</td>
                            <td>R$ ${inquilino.aluguel.toFixed(2)}</td>
                            <td>R$ ${inquilino.agua.toFixed(2)}</td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="editarInquilino('${uid}')">Editar</button>
                                <button class="btn btn-sm btn-danger" onclick="excluirInquilino('${uid}')">Excluir</button>
                            </td>
                        `;
                        
                        tabela.appendChild(linha);
                    });
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar inquilinos:', error);
            });
    }
    
    // Carregar pagamentos pendentes
    function carregarPagamentosPendentes() {
        const tabela = document.getElementById('tabelaPendentes');
        tabela.innerHTML = '';
        
        database.ref('pagamentos').once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshotUid) => {
                        const uid = childSnapshotUid.key;
                        
                        childSnapshotUid.forEach((childSnapshotPagamento) => {
                            const pagamento = childSnapshotPagamento.val();
                            const idPagamento = childSnapshotPagamento.key;
                            
                            if (pagamento.status === 'pendente') {
                                // Buscar dados do inquilino
                                database.ref('inquilinos/' + uid).once('value')
                                    .then((snapshotInquilino) => {
                                        if (snapshotInquilino.exists()) {
                                            const inquilino = snapshotInquilino.val();
                                            
                                            const linha = document.createElement('tr');
                                            linha.innerHTML = `
                                                <td>${inquilino.nome}</td>
                                                <td>${inquilino.casa}</td>
                                                <td>${pagamento.mes}/${pagamento.ano}</td>
                                                <td>R$ ${pagamento.valor ? pagamento.valor.toFixed(2) : '0.00'}</td>
                                                <td>${pagamento.metodo}</td>
                                                <td>${new Date(pagamento.dataSolicitacao).toLocaleDateString('pt-BR')}</td>
                                                <td>
                                                    <button class="btn btn-sm btn-success" onclick="confirmarPagamento('${uid}', '${idPagamento}')">Confirmar</button>
                                                    <button class="btn btn-sm btn-danger" onclick="rejeitarPagamento('${uid}', '${idPagamento}')">Rejeitar</button>
                                                </td>
                                            `;
                                            
                                            tabela.appendChild(linha);
                                        }
                                    });
                            }
                        });
                    });
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar pagamentos pendentes:', error);
            });
    }

    // === NOVA FUNÇÃO: Carregar pagamentos efetuados ===
    function carregarPagamentosEfetuados() {
        const tabela = document.getElementById('tabelaEfetuados');
        if (!tabela) return; // Verifica se a tabela existe
        
        tabela.innerHTML = '';
        
        const filtroMes = document.getElementById('filtroMes') ? document.getElementById('filtroMes').value : '';
        const filtroAno = document.getElementById('filtroAno') ? document.getElementById('filtroAno').value : '';
        
        database.ref('pagamentos').once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const pagamentosEfetuados = [];
                    
                    snapshot.forEach((childSnapshotUid) => {
                        const uid = childSnapshotUid.key;
                        
                        childSnapshotUid.forEach((childSnapshotPagamento) => {
                            const pagamento = childSnapshotPagamento.val();
                            const idPagamento = childSnapshotPagamento.key;
                            
                            // Filtra apenas pagamentos confirmados/pagos
                            if (pagamento.status === 'pago' || pagamento.status === 'aprovado') {
                                // Aplica filtros de mês e ano
                                if (filtroMes && pagamento.mes !== filtroMes) return;
                                if (filtroAno && pagamento.ano !== filtroAno) return;
                                
                                pagamentosEfetuados.push({
                                    uid: uid,
                                    idPagamento: idPagamento,
                                    pagamento: pagamento
                                });
                            }
                        });
                    });
                    
                    // Ordena por data mais recente primeiro
                    pagamentosEfetuados.sort((a, b) => {
                        const dataA = new Date(a.pagamento.dataPagamento || a.pagamento.dataSolicitacao);
                        const dataB = new Date(b.pagamento.dataPagamento || b.pagamento.dataSolicitacao);
                        return dataB - dataA;
                    });
                    
                    // Processa cada pagamento e busca o nome do inquilino
                    let processados = 0;
                    if (pagamentosEfetuados.length === 0) {
                        tabela.innerHTML = `
                            <tr>
                                <td colspan="7" class="text-center">Nenhum pagamento efetuado encontrado</td>
                            </tr>
                        `;
                        return;
                    }
                    
                    pagamentosEfetuados.forEach((item) => {
                        database.ref('inquilinos/' + item.uid).once('value')
                            .then((snapshotInquilino) => {
                                if (snapshotInquilino.exists()) {
                                    const inquilino = snapshotInquilino.val();
                                    
                                    const linha = document.createElement('tr');
                                    linha.innerHTML = `
                                        <td>${inquilino.nome}</td>
                                        <td>${inquilino.casa}</td>
                                        <td>${item.pagamento.mes}/${item.pagamento.ano}</td>
                                        <td>R$ ${item.pagamento.valor ? item.pagamento.valor.toFixed(2) : '0.00'}</td>
                                        <td>${item.pagamento.metodo}</td>
                                        <td>${formatarData(item.pagamento.dataPagamento)}</td>
                                        <td>
                                            <span class="badge bg-success">${item.pagamento.status}</span>
                                        </td>
                                    `;
                                    
                                    tabela.appendChild(linha);
                                }
                                
                                processados++;
                                if (processados === pagamentosEfetuados.length && tabela.children.length === 0) {
                                    tabela.innerHTML = `
                                        <tr>
                                            <td colspan="7" class="text-center">Nenhum pagamento efetuado encontrado</td>
                                        </tr>
                                    `;
                                }
                            })
                            .catch((error) => {
                                console.error('Erro ao buscar dados do inquilino:', error);
                                processados++;
                            });
                    });
                } else {
                    tabela.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center">Nenhum pagamento efetuado encontrado</td>
                        </tr>
                    `;
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar pagamentos efetuados:', error);
                tabela.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">Erro ao carregar pagamentos</td>
                    </tr>
                `;
            });
    }

    // === NOVA FUNÇÃO: Formatar data ===
    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR');
        } catch (error) {
            return dataString;
        }
    }
    
    // Adicionar novo inquilino
    document.getElementById('btnSalvarInquilino').addEventListener('click', function() {
        const nome = document.getElementById('nome').value;
        const cpf = document.getElementById('cpf').value;
        const senha = document.getElementById('senha').value;
        const casa = document.getElementById('casa').value;
        const aluguel = parseFloat(document.getElementById('aluguel').value);
        const agua = parseFloat(document.getElementById('agua').value);
        
        // Criar usuário no Firebase Auth
        auth.createUserWithEmailAndPassword(`${cpf}@alugueis.com`, senha)
            .then((userCredential) => {
                const uid = userCredential.user.uid;
                
                // Salvar dados no Realtime Database
                const inquilino = {
                    nome: nome,
                    cpf: cpf,
                    casa: casa,
                    aluguel: aluguel,
                    agua: agua
                };
                
                return database.ref('inquilinos/' + uid).set(inquilino);
            })
            .then(() => {
                alert('Inquilino cadastrado com sucesso!');
                document.querySelector('[data-bs-dismiss="modal"]').click();
                document.getElementById('formNovoInquilino').reset();
                carregarInquilinos();
            })
            .catch((error) => {
                console.error('Erro ao cadastrar inquilino:', error);
                alert('Erro ao cadastrar inquilino. Verifique os dados e tente novamente.');
            });
    });
    
    // Funções globais para os botões de ação
    window.confirmarPagamento = function(uid, idPagamento) {
        const updates = {};
        updates[`pagamentos/${uid}/${idPagamento}/status`] = 'pago';
        updates[`pagamentos/${uid}/${idPagamento}/dataPagamento`] = new Date().toISOString();
        
        database.ref().update(updates)
            .then(() => {
                alert('Pagamento confirmado!');
                carregarPagamentosPendentes();
                carregarPagamentosEfetuados(); // Atualiza a aba de efetuados também
            })
            .catch((error) => {
                console.error('Erro ao confirmar pagamento:', error);
                alert('Erro ao confirmar pagamento.');
            });
    };
    
    window.rejeitarPagamento = function(uid, idPagamento) {
        database.ref(`pagamentos/${uid}/${idPagamento}/status`).set('rejeitado')
            .then(() => {
                alert('Pagamento rejeitado!');
                carregarPagamentosPendentes();
            })
            .catch((error) => {
                console.error('Erro ao rejeitar pagamento:', error);
                alert('Erro ao rejeitar pagamento.');
            });
    };
    
    window.editarInquilino = function(uid) {
        // Implementar edição de inquilino
        alert('Funcionalidade de edição em desenvolvimento');
    };
    
    window.excluirInquilino = function(uid) {
        if (confirm('Tem certeza que deseja excluir este inquilino?')) {
            database.ref('inquilinos/' + uid).remove()
                .then(() => {
                    alert('Inquilino excluído com sucesso!');
                    carregarInquilinos();
                })
                .catch((error) => {
                    console.error('Erro ao excluir inquilino:', error);
                    alert('Erro ao excluir inquilino.');
                });
        }
    };

    // === NOVOS EVENT LISTENERS para as abas ===
    
    // Recarregar dados quando mudar de aba
    const tabs = document.querySelectorAll('#adminTabs button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            const target = event.target.getAttribute('data-bs-target');
            if (target === '#efetuados') {
                carregarPagamentosEfetuados();
            } else if (target === '#pendentes') {
                carregarPagamentosPendentes();
            } else if (target === '#inquilinos') {
                carregarInquilinos();
            }
        });
    });

    // Event listeners para os filtros
    document.addEventListener('change', function(event) {
        if (event.target.id === 'filtroMes' || event.target.id === 'filtroAno') {
            carregarPagamentosEfetuados();
        }
    });
    
    // Carregar dados iniciais
    carregarInquilinos();
    carregarPagamentosPendentes();
    
    // Carrega pagamentos efetuados apenas se a aba estiver ativa
    setTimeout(() => {
        const abaAtiva = document.querySelector('#adminTabs .nav-link.active');
        if (abaAtiva && abaAtiva.getAttribute('data-bs-target') === '#efetuados') {
            carregarPagamentosEfetuados();
        }
    }, 1000);
});