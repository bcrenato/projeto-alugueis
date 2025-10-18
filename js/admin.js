document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const database = firebase.database();
    
    // Variável para armazenar o UID do inquilino sendo editado
    let inquilinoEditando = null;
    
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

    // === FUNÇÃO: Carregar pagamentos efetuados ===
    // === FUNÇÃO CORRIGIDA: Carregar pagamentos efetuados ===
function carregarPagamentosEfetuados() {
    const tabela = document.getElementById('tabelaEfetuados');
    if (!tabela) return;
    
    tabela.innerHTML = '<tr><td colspan="7" class="text-center">Carregando...</td></tr>';
    
    const filtroMes = document.getElementById('filtroMes') ? document.getElementById('filtroMes').value : '';
    const filtroAno = document.getElementById('filtroAno') ? document.getElementById('filtroAno').value : '';
    
    console.log('🔍 Filtros aplicados:', { mes: filtroMes, ano: filtroAno });
    
    database.ref('pagamentos').once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                tabela.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum pagamento encontrado</td></tr>';
                return;
            }

            const pagamentosEfetuados = [];
            const promises = [];

            snapshot.forEach((childSnapshotUid) => {
                const uid = childSnapshotUid.key;
                
                childSnapshotUid.forEach((childSnapshotPagamento) => {
                    const pagamento = childSnapshotPagamento.val();
                    const idPagamento = childSnapshotPagamento.key;
                    
                    // DEBUG: Mostrar todos os pagamentos
                    console.log('📄 Pagamento encontrado:', {
                        uid: uid,
                        id: idPagamento,
                        mes: pagamento.mes,
                        ano: pagamento.ano,
                        status: pagamento.status,
                        valor: pagamento.valor
                    });

                    // Verificar se é um pagamento efetuado
                    if (pagamento.status === 'pago' || pagamento.status === 'aprovado') {
                        // Aplicar filtros
                        let deveIncluir = true;
                        
                        if (filtroMes && pagamento.mes != filtroMes) {
                            deveIncluir = false;
                            console.log('❌ Filtrado por mês:', pagamento.mes, '!=', filtroMes);
                        }
                        
                        if (filtroAno && pagamento.ano != filtroAno) {
                            deveIncluir = false;
                            console.log('❌ Filtrado por ano:', pagamento.ano, '!=', filtroAno);
                        }
                        
                        if (deveIncluir) {
                            console.log('✅ Incluindo pagamento:', pagamento.mes + '/' + pagamento.ano);
                            pagamentosEfetuados.push({
                                uid: uid,
                                idPagamento: idPagamento,
                                pagamento: pagamento
                            });
                        }
                    }
                });
            });

            console.log('📊 Total de pagamentos após filtro:', pagamentosEfetuados.length);

            if (pagamentosEfetuados.length === 0) {
                let mensagem = 'Nenhum pagamento efetuado encontrado';
                if (filtroMes || filtroAno) {
                    mensagem += ' com os filtros atuais';
                }
                tabela.innerHTML = `<tr><td colspan="7" class="text-center">${mensagem}</td></tr>`;
                return;
            }

            // Ordenar por data (mais recente primeiro)
            pagamentosEfetuados.sort((a, b) => {
                const dataA = new Date(a.pagamento.dataPagamento || a.pagamento.dataSolicitacao || 0);
                const dataB = new Date(b.pagamento.dataPagamento || b.pagamento.dataSolicitacao || 0);
                return dataB - dataA;
            });

            // Limpar tabela
            tabela.innerHTML = '';

            // Processar cada pagamento
            pagamentosEfetuados.forEach((item) => {
                const promise = database.ref('inquilinos/' + item.uid).once('value')
                    .then((snapshotInquilino) => {
                        let nomeInquilino = 'Inquilino não encontrado';
                        let casaInquilino = 'N/A';
                        
                        if (snapshotInquilino.exists()) {
                            const inquilino = snapshotInquilino.val();
                            nomeInquilino = inquilino.nome;
                            casaInquilino = inquilino.casa;
                        }

                        const linha = document.createElement('tr');
                        linha.innerHTML = `
                            <td>${nomeInquilino}</td>
                            <td>${casaInquilino}</td>
                            <td>${item.pagamento.mes}/${item.pagamento.ano}</td>
                            <td>R$ ${item.pagamento.valor ? parseFloat(item.pagamento.valor).toFixed(2) : '0.00'}</td>
                            <td>${item.pagamento.metodo || 'N/A'}</td>
                            <td>${formatarData(item.pagamento.dataPagamento)}</td>
                            <td><span class="badge bg-success">${item.pagamento.status}</span></td>
                        `;
                        
                        tabela.appendChild(linha);
                    })
                    .catch((error) => {
                        console.error('Erro ao buscar inquilino:', error);
                        
                        // Mesmo com erro, mostra o pagamento
                        const linha = document.createElement('tr');
                        linha.innerHTML = `
                            <td>Erro ao carregar</td>
                            <td>N/A</td>
                            <td>${item.pagamento.mes}/${item.pagamento.ano}</td>
                            <td>R$ ${item.pagamento.valor ? parseFloat(item.pagamento.valor).toFixed(2) : '0.00'}</td>
                            <td>${item.pagamento.metodo || 'N/A'}</td>
                            <td>${formatarData(item.pagamento.dataPagamento)}</td>
                            <td><span class="badge bg-success">${item.pagamento.status}</span></td>
                        `;
                        tabela.appendChild(linha);
                    });
                
                promises.push(promise);
            });

            return Promise.all(promises);
        })
        .catch((error) => {
            console.error('❌ Erro ao carregar pagamentos:', error);
            tabela.innerHTML = '<tr><td colspan="7" class="text-center">Erro ao carregar pagamentos</td></tr>';
        });
}

    // === FUNÇÃO: Formatar data ===
    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR');
        } catch (error) {
            return dataString;
        }
    }
    
    // === FUNÇÃO: Abrir modal de edição ===
    window.editarInquilino = function(uid) {
        inquilinoEditando = uid;
        
        // Buscar dados do inquilino
        database.ref('inquilinos/' + uid).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const inquilino = snapshot.val();
                    
                    // Preencher o formulário com os dados atuais
                    document.getElementById('nome').value = inquilino.nome;
                    document.getElementById('cpf').value = inquilino.cpf;
                    document.getElementById('casa').value = inquilino.casa;
                    document.getElementById('aluguel').value = inquilino.aluguel;
                    document.getElementById('agua').value = inquilino.agua;
                    
                    // Alterar o título do modal e texto do botão
                    document.querySelector('#modalNovoInquilino .modal-title').textContent = 'Editar Inquilino';
                    document.getElementById('btnSalvarInquilino').textContent = 'Atualizar';
                    
                    // Esconder campo de senha para edição
                    document.getElementById('senha').closest('.mb-3').style.display = 'none';
                    
                    // Abrir o modal
                    const modal = new bootstrap.Modal(document.getElementById('modalNovoInquilino'));
                    modal.show();
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar dados do inquilino:', error);
                alert('Erro ao carregar dados do inquilino.');
            });
    };
    
    // === FUNÇÃO: Salvar/Atualizar inquilino ===
    document.getElementById('btnSalvarInquilino').addEventListener('click', function() {
        const nome = document.getElementById('nome').value;
        const cpf = document.getElementById('cpf').value;
        const senha = document.getElementById('senha').value;
        const casa = document.getElementById('casa').value;
        const aluguel = parseFloat(document.getElementById('aluguel').value);
        const agua = parseFloat(document.getElementById('agua').value);
        
        if (inquilinoEditando) {
            // MODO EDIÇÃO - Atualizar inquilino existente
            const dadosAtualizados = {
                nome: nome,
                cpf: cpf,
                casa: casa,
                aluguel: aluguel,
                agua: agua
            };
            
            // Se foi informada uma nova senha, atualizar no Auth também
            if (senha && senha.trim() !== '') {
                auth.currentUser.updatePassword(senha)
                    .then(() => {
                        console.log('Senha atualizada com sucesso');
                    })
                    .catch((error) => {
                        console.error('Erro ao atualizar senha:', error);
                        // Continua mesmo se der erro na senha
                    });
            }
            
            database.ref('inquilinos/' + inquilinoEditando).update(dadosAtualizados)
                .then(() => {
                    alert('Inquilino atualizado com sucesso!');
                    fecharModal();
                    carregarInquilinos();
                })
                .catch((error) => {
                    console.error('Erro ao atualizar inquilino:', error);
                    alert('Erro ao atualizar inquilino. Verifique os dados e tente novamente.');
                });
                
        } else {
            // MODO NOVO - Criar novo inquilino
            if (!senha) {
                alert('Por favor, informe uma senha para o novo inquilino.');
                return;
            }
            
            auth.createUserWithEmailAndPassword(`${cpf}@alugueis.com`, senha)
                .then((userCredential) => {
                    const uid = userCredential.user.uid;
                    
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
                    fecharModal();
                    carregarInquilinos();
                })
                .catch((error) => {
                    console.error('Erro ao cadastrar inquilino:', error);
                    alert('Erro ao cadastrar inquilino. Verifique os dados e tente novamente.');
                });
        }
    });
    
    // === FUNÇÃO: Fechar modal e resetar formulário ===
    function fecharModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoInquilino'));
        modal.hide();
        
        // Resetar formulário
        document.getElementById('formNovoInquilino').reset();
        document.querySelector('#modalNovoInquilino .modal-title').textContent = 'Adicionar Inquilino';
        document.getElementById('btnSalvarInquilino').textContent = 'Salvar';
        document.getElementById('senha').closest('.mb-3').style.display = 'block';
        inquilinoEditando = null;
    }
    
    // === EVENTO: Quando o modal é fechado ===
    document.getElementById('modalNovoInquilino').addEventListener('hidden.bs.modal', function() {
        fecharModal();
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
                carregarPagamentosEfetuados();
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
    
    window.excluirInquilino = function(uid) {
        if (confirm('Tem certeza que deseja excluir este inquilino?\n\nEsta ação não pode ser desfeita!')) {
            // Primeiro excluir do Authentication
            auth.getUser(uid)
                .then((userRecord) => {
                    return auth.deleteUser(uid);
                })
                .then(() => {
                    // Depois excluir do Realtime Database
                    return database.ref('inquilinos/' + uid).remove();
                })
                .then(() => {
                    alert('Inquilino excluído com sucesso!');
                    carregarInquilinos();
                })
                .catch((error) => {
                    console.error('Erro ao excluir inquilino:', error);
                    
                    // Se não conseguir excluir do Auth, tenta apenas do Database
                    database.ref('inquilinos/' + uid).remove()
                        .then(() => {
                            alert('Inquilino excluído do sistema, mas pode restar o usuário no login.');
                            carregarInquilinos();
                        })
                        .catch((error2) => {
                            alert('Erro ao excluir inquilino completamente.');
                        });
                });
        }
    };

    // === EVENT LISTENERS para as abas ===
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
