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
                    console.error('Er
