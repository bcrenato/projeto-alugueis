document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const database = firebase.database();
    
    // Variáveis para armazenar estados
    let inquilinoEditando = null;
    let pagamentoEditando = null;
    
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
                    
                    // Atualizar o filtro de inquilinos na aba de pagamentos efetuados
                    atualizarFiltroInquilinos(snapshot);
                    // Atualizar o select de inquilinos para pagamentos manuais
                    carregarInquilinosParaPagamento();
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar inquilinos:', error);
            });
    }
    
    // === NOVA FUNÇÃO: Carregar inquilinos no select de pagamentos ===
    function carregarInquilinosParaPagamento() {
        const selectInquilino = document.getElementById('selectInquilinoPagamento');
        if (!selectInquilino) return;
        
        selectInquilino.innerHTML = '<option value="">Selecione o inquilino</option>';
        
        database.ref('inquilinos').once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        const inquilino = childSnapshot.val();
                        const uid = childSnapshot.key;
                        
                        const option = document.createElement('option');
                        option.value = uid;
                        option.textContent = `${inquilino.nome} - ${inquilino.casa} (Aluguel: R$ ${inquilino.aluguel.toFixed(2)} + Água: R$ ${inquilino.agua.toFixed(2)})`;
                        option.setAttribute('data-aluguel', inquilino.aluguel);
                        option.setAttribute('data-agua', inquilino.agua);
                        selectInquilino.appendChild(option);
                    });
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar inquilinos para pagamento:', error);
            });
    }

    // === NOVA FUNÇÃO: Calcular valor automaticamente ===
    function calcularValorPagamento() {
        const selectInquilino = document.getElementById('selectInquilinoPagamento');
        const checkAgua = document.getElementById('checkAluguelAgua');
        const inputValor = document.getElementById('novoValor');
        
        if (!selectInquilino || !selectInquilino.value) return;
        
        const selectedOption = selectInquilino.options[selectInquilino.selectedIndex];
        const aluguel = parseFloat(selectedOption.getAttribute('data-aluguel'));
        const agua = parseFloat(selectedOption.getAttribute('data-agua'));
        
        let valorTotal = aluguel;
        if (checkAgua && checkAgua.checked) {
            valorTotal += agua;
        }
        
        inputValor.value = valorTotal.toFixed(2);
    }
    
    // === NOVA FUNÇÃO: Atualizar filtro de inquilinos ===
    function atualizarFiltroInquilinos(snapshot) {
        const selectInquilino = document.getElementById('filtroInquilino');
        if (!selectInquilino) return;
        
        // Limpar opções existentes (mantendo "Todos os inquilinos")
        const opcaoTodos = selectInquilino.options[0];
        selectInquilino.innerHTML = '';
        selectInquilino.appendChild(opcaoTodos);
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const inquilino = childSnapshot.val();
                const uid = childSnapshot.key;
                
                const option = document.createElement('option');
                option.value = uid;
                option.textContent = `${inquilino.nome} - ${inquilino.casa}`;
                selectInquilino.appendChild(option);
            });
            
            console.log('✅ Filtro de inquilinos atualizado');
        }
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
    function carregarPagamentosEfetuados() {
        const tabela = document.getElementById('tabelaEfetuados');
        if (!tabela) return;
        
        tabela.innerHTML = '<tr><td colspan="8" class="text-center">Carregando...</td></tr>';
        
        const filtroMes = document.getElementById('filtroMes') ? document.getElementById('filtroMes').value : '';
        const filtroAno = document.getElementById('filtroAno') ? document.getElementById('filtroAno').value : '';
        const filtroInquilino = document.getElementById('filtroInquilino') ? document.getElementById('filtroInquilino').value : '';
        
        console.log('🔍 Filtros aplicados:', { mes: filtroMes, ano: filtroAno, inquilino: filtroInquilino });
        
        database.ref('pagamentos').once('value')
            .then((snapshot) => {
                if (!snapshot.exists()) {
                    tabela.innerHTML = '<tr><td colspan="8" class="text-center">Nenhum pagamento encontrado</td></tr>';
                    return;
                }

                const pagamentosEfetuados = [];
                const promises = [];

                snapshot.forEach((childSnapshotUid) => {
                    const uid = childSnapshotUid.key;
                    
                    // Aplicar filtro de inquilino
                    if (filtroInquilino && uid !== filtroInquilino) {
                        return;
                    }
                    
                    childSnapshotUid.forEach((childSnapshotPagamento) => {
                        const pagamento = childSnapshotPagamento.val();
                        const idPagamento = childSnapshotPagamento.key;
                        
                        // Verificar se é um pagamento efetuado
                        if (pagamento.status === 'pago' || pagamento.status === 'aprovado') {
                            // Aplicar filtros
                            let deveIncluir = true;
                            
                            if (filtroMes && pagamento.mes != filtroMes) {
                                deveIncluir = false;
                            }
                            
                            if (filtroAno && pagamento.ano != filtroAno) {
                                deveIncluir = false;
                            }
                            
                            if (deveIncluir) {
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
                    if (filtroMes || filtroAno || filtroInquilino) {
                        mensagem += ' com os filtros atuais';
                    }
                    tabela.innerHTML = `<tr><td colspan="8" class="text-center">${mensagem}</td></tr>`;
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
                                <td>
                                    <button class="btn btn-sm btn-warning" onclick="editarPagamento('${item.uid}', '${item.idPagamento}')">Editar</button>
                                    <button class="btn btn-sm btn-danger" onclick="excluirPagamento('${item.uid}', '${item.idPagamento}')">Excluir</button>
                                </td>
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
                                <td>
                                    <button class="btn btn-sm btn-warning" onclick="editarPagamento('${item.uid}', '${item.idPagamento}')">Editar</button>
                                    <button class="btn btn-sm btn-danger" onclick="excluirPagamento('${item.uid}', '${item.idPagamento}')">Excluir</button>
                                </td>
                            `;
                            tabela.appendChild(linha);
                        });
                    
                    promises.push(promise);
                });

                return Promise.all(promises);
            })
            .catch((error) => {
                console.error('❌ Erro ao carregar pagamentos:', error);
                tabela.innerHTML = '<tr><td colspan="8" class="text-center">Erro ao carregar pagamentos</td></tr>';
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

    // === FUNÇÃO AUXILIAR: Formatar data para input date ===
    function formatarDataParaInput(dataString) {
        if (!dataString) return '';
        try {
            const data = new Date(dataString);
            return data.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }
    
    // === FUNÇÃO: Detectar e carregar anos existentes nos pagamentos ===
    function carregarAnosDisponiveis() {
        const selectAno = document.getElementById('filtroAno');
        if (!selectAno) {
            console.log('❌ Select de ano não encontrado');
            return;
        }
        
        console.log('📅 Buscando anos disponíveis nos pagamentos...');
        
        database.ref('pagamentos').once('value')
            .then((snapshot) => {
                if (!snapshot.exists()) {
                    console.log('ℹ️ Nenhum pagamento encontrado para extrair anos');
                    adicionarAnosPadrao(selectAno);
                    return;
                }
                
                const anosUnicos = new Set();
                const anoAtual = new Date().getFullYear();
                
                // Coletar todos os anos existentes nos pagamentos
                snapshot.forEach((childSnapshotUid) => {
                    childSnapshotUid.forEach((childSnapshotPagamento) => {
                        const pagamento = childSnapshotPagamento.val();
                        if (pagamento.ano && pagamento.ano.toString().trim() !== '') {
                            const ano = pagamento.ano.toString();
                            anosUnicos.add(ano);
                        }
                    });
                });
                
                // Adicionar ano atual se não existir
                if (!anosUnicos.has(anoAtual.toString())) {
                    anosUnicos.add(anoAtual.toString());
                }
                
                // Adicionar alguns anos anteriores como fallback se estiver vazio
                if (anosUnicos.size === 0) {
                    adicionarAnosPadrao(selectAno);
                    return;
                }
                
                // Converter para array e ordenar do mais recente para o mais antigo
                const anosArray = Array.from(anosUnicos).sort((a, b) => b - a);
                
                // Limpar e reconstruir o select
                const opcaoTodos = selectAno.options[0];
                selectAno.innerHTML = '';
                selectAno.appendChild(opcaoTodos);
                
                // Adicionar cada ano ao select
                anosArray.forEach(ano => {
                    const option = document.createElement('option');
                    option.value = ano;
                    option.textContent = ano;
                    selectAno.appendChild(option);
                });
                
                console.log(`✅ Select de anos atualizado com ${anosArray.length} anos`);
                
            })
            .catch((error) => {
                console.error('❌ Erro ao carregar anos disponíveis:', error);
                const selectAno = document.getElementById('filtroAno');
                if (selectAno) {
                    adicionarAnosPadrao(selectAno);
                }
            });
    }

    // === FUNÇÃO: Adicionar anos padrão como fallback ===
    function adicionarAnosPadrao(selectElement) {
        const anoAtual = new Date().getFullYear();
        const anosPadrao = [];
        
        // Adicionar dos últimos 3 anos aos próximos 2 anos
        for (let i = 3; i >= 0; i--) {
            anosPadrao.push(anoAtual - i);
        }
        for (let i = 1; i <= 2; i++) {
            anosPadrao.push(anoAtual + i);
        }
        
        // Ordenar do mais recente para o mais antigo
        anosPadrao.sort((a, b) => b - a);
        
        // Limpar e adicionar opções
        const opcaoTodos = selectElement.options[0];
        selectElement.innerHTML = '';
        selectElement.appendChild(opcaoTodos);
        
        anosPadrao.forEach(ano => {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            selectElement.appendChild(option);
        });
    }
    
    // === FUNÇÃO: Abrir modal de edição de inquilino ===
    window.editarInquilino = function(uid) {
        inquilinoEditando = uid;
        
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

    // === NOVA FUNÇÃO: Abrir modal de edição de pagamento ===
    window.editarPagamento = function(uid, idPagamento) {
        pagamentoEditando = { uid, idPagamento };
        
        database.ref(`pagamentos/${uid}/${idPagamento}`).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const pagamento = snapshot.val();
                    
                    // Preencher o formulário com os dados atuais
                    document.getElementById('editMes').value = pagamento.mes;
                    document.getElementById('editAno').value = pagamento.ano;
                    document.getElementById('editValor').value = pagamento.valor;
                    document.getElementById('editMetodo').value = pagamento.metodo || '';
                    document.getElementById('editDataPagamento').value = formatarDataParaInput(pagamento.dataPagamento);
                    
                    // Buscar nome do inquilino para exibir
                    database.ref('inquilinos/' + uid).once('value')
                        .then((snapInquilino) => {
                            if (snapInquilino.exists()) {
                                const inquilino = snapInquilino.val();
                                document.getElementById('nomeInquilinoPagamento').textContent = 
                                    `${inquilino.nome} - ${inquilino.casa}`;
                            }
                        });
                    
                    // Abrir o modal
                    const modal = new bootstrap.Modal(document.getElementById('modalEditarPagamento'));
                    modal.show();
                }
            })
            .catch((error) => {
                console.error('Erro ao carregar dados do pagamento:', error);
                alert('Erro ao carregar dados do pagamento.');
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
            
            if (senha && senha.trim() !== '') {
                auth.currentUser.updatePassword(senha)
                    .then(() => {
                        console.log('Senha atualizada com sucesso');
                    })
                    .catch((error) => {
                        console.error('Erro ao atualizar senha:', error);
                    });
            }
            
            database.ref('inquilinos/' + inquilinoEditando).update(dadosAtualizados)
                .then(() => {
                    alert('Inquilino atualizado com sucesso!');
                    fecharModalInquilino();
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
                    fecharModalInquilino();
                    carregarInquilinos();
                })
                .catch((error) => {
                    console.error('Erro ao cadastrar inquilino:', error);
                    alert('Erro ao cadastrar inquilino. Verifique os dados e tente novamente.');
                });
        }
    });

    // === NOVA FUNÇÃO: Salvar edição de pagamento ===
    document.getElementById('btnSalvarPagamento').addEventListener('click', function() {
        if (!pagamentoEditando) return;
        
        const mes = document.getElementById('editMes').value;
        const ano = document.getElementById('editAno').value;
        const valor = parseFloat(document.getElementById('editValor').value);
        const metodo = document.getElementById('editMetodo').value;
        const dataPagamento = document.getElementById('editDataPagamento').value;
        
        if (!mes || !ano || !valor) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        const dadosAtualizados = {
            mes: mes,
            ano: ano,
            valor: valor,
            metodo: metodo,
            dataPagamento: dataPagamento ? new Date(dataPagamento).toISOString() : null
        };
        
        database.ref(`pagamentos/${pagamentoEditando.uid}/${pagamentoEditando.idPagamento}`).update(dadosAtualizados)
            .then(() => {
                alert('Pagamento atualizado com sucesso!');
                fecharModalPagamento();
                carregarPagamentosEfetuados();
            })
            .catch((error) => {
                console.error('Erro ao atualizar pagamento:', error);
                alert('Erro ao atualizar pagamento. Verifique os dados e tente novamente.');
            });
    });

    // === NOVA FUNÇÃO: Registrar pagamento manual ===
    document.getElementById('btnRegistrarPagamento').addEventListener('click', function() {
        const uidInquilino = document.getElementById('selectInquilinoPagamento').value;
        const mes = document.getElementById('novoMes').value;
        const ano = document.getElementById('novoAno').value;
        const valor = parseFloat(document.getElementById('novoValor').value);
        const metodo = document.getElementById('novoMetodo').value;
        const dataPagamento = document.getElementById('novaDataPagamento').value;
        
        if (!uidInquilino || !mes || !ano || !valor || !metodo || !dataPagamento) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        // Verificar se já existe pagamento para este mês/ano
        database.ref(`pagamentos/${uidInquilino}`).orderByChild('mes').equalTo(mes).once('value')
            .then((snapshot) => {
                let pagamentoExistente = false;
                
                snapshot.forEach((childSnapshot) => {
                    const pagamento = childSnapshot.val();
                    if (pagamento.ano == ano) {
                        pagamentoExistente = true;
                    }
                });
                
                if (pagamentoExistente) {
                    if (!confirm('Já existe um pagamento registrado para este mês/ano. Deseja substituí-lo?')) {
                        return;
                    }
                }
                
                // Criar novo pagamento
                const novoPagamentoRef = database.ref(`pagamentos/${uidInquilino}`).push();
                const dadosPagamento = {
                    mes: mes,
                    ano: ano,
                    valor: valor,
                    metodo: metodo,
                    dataPagamento: new Date(dataPagamento).toISOString(),
                    status: 'pago',
                    tipo: 'manual',
                    registradoPor: 'admin',
                    dataRegistro: new Date().toISOString()
                };
                
                return novoPagamentoRef.set(dadosPagamento);
            })
            .then(() => {
                alert('Pagamento registrado com sucesso!');
                
                // Fechar modal e resetar formulário
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoPagamento'));
                modal.hide();
                document.getElementById('formNovoPagamento').reset();
                
                // Atualizar dados
                carregarPagamentosEfetuados();
                
                // Recarregar anos disponíveis
                carregarAnosDisponiveis();
            })
            .catch((error) => {
                console.error('Erro ao registrar pagamento:', error);
                alert('Erro ao registrar pagamento: ' + error.message);
            });
    });
    
    // === FUNÇÃO: Fechar modal e resetar formulário de inquilino ===
    function fecharModalInquilino() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalNovoInquilino'));
        modal.hide();
        
        document.getElementById('formNovoInquilino').reset();
        document.querySelector('#modalNovoInquilino .modal-title').textContent = 'Adicionar Inquilino';
        document.getElementById('btnSalvarInquilino').textContent = 'Salvar';
        document.getElementById('senha').closest('.mb-3').style.display = 'block';
        inquilinoEditando = null;
    }

    // === NOVA FUNÇÃO: Fechar modal de pagamento ===
    function fecharModalPagamento() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarPagamento'));
        modal.hide();
        
        document.getElementById('formEditarPagamento').reset();
        pagamentoEditando = null;
    }
    
    // === EVENTO: Quando o modal é fechado ===
    document.getElementById('modalNovoInquilino').addEventListener('hidden.bs.modal', function() {
        fecharModalInquilino();
    });

    document.getElementById('modalEditarPagamento').addEventListener('hidden.bs.modal', function() {
        fecharModalPagamento();
    });

    // === EVENTO: Quando o modal de pagamento for aberto ===
    document.getElementById('modalNovoPagamento').addEventListener('show.bs.modal', function() {
        // Garantir que os inquilinos estão carregados
        carregarInquilinosParaPagamento();
        
        // Configurar ano atual
        const anoAtual = new Date().getFullYear();
        document.getElementById('novoAno').value = anoAtual;
        
        // Resetar checkbox
        const checkAgua = document.getElementById('checkAluguelAgua');
        if (checkAgua) checkAgua.checked = false;
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

    // === NOVA FUNÇÃO: Excluir pagamento ===
    window.excluirPagamento = function(uid, idPagamento) {
        if (confirm('Tem certeza que deseja excluir este pagamento?\n\nEsta ação não pode ser desfeita!')) {
            database.ref(`pagamentos/${uid}/${idPagamento}`).remove()
                .then(() => {
                    alert('Pagamento excluído com sucesso!');
                    carregarPagamentosEfetuados();
                })
                .catch((error) => {
                    console.error('Erro ao excluir pagamento:', error);
                    alert('Erro ao excluir pagamento.');
                });
        }
    };
    
    window.excluirInquilino = function(uid) {
        if (confirm('Tem certeza que deseja excluir este inquilino?\n\nEsta ação não pode ser desfeita!')) {
            auth.getUser(uid)
                .then((userRecord) => {
                    return auth.deleteUser(uid);
                })
                .then(() => {
                    return database.ref('inquilinos/' + uid).remove();
                })
                .then(() => {
                    alert('Inquilino excluído com sucesso!');
                    carregarInquilinos();
                })
                .catch((error) => {
                    console.error('Erro ao excluir inquilino:', error);
                    
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

    // Event listeners para os filtros e cálculos
    document.addEventListener('change', function(event) {
        // Filtros de pagamentos efetuados
        if (event.target.id === 'filtroMes' || event.target.id === 'filtroAno' || event.target.id === 'filtroInquilino') {
            carregarPagamentosEfetuados();
        }
        
        // Cálculo automático de valor para pagamento manual
        if (event.target.id === 'selectInquilinoPagamento' || event.target.id === 'checkAluguelAgua') {
            calcularValorPagamento();
        }
    });
    
    // === CARREGAMENTO INICIAL ===
    
    // Carregar anos disponíveis automaticamente
    carregarAnosDisponiveis();
    
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
