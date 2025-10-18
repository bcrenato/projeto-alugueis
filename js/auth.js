// Configuração do Firebase
const firebaseConfig = {
    // INSIRA SUAS CONFIGURAÇÕES DO FIREBASE AQUI
    apiKey: "sua-api-key",
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "seu-sender-id",
    appId: "seu-app-id"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Verificar se o usuário está logado
function verificarAutenticacao() {
    auth.onAuthStateChanged((user) => {
        if (user && window.location.pathname.includes('login.html')) {
            window.location.href = 'inquilino.html';
        } else if (!user && !window.location.pathname.includes('login.html') && 
                   !window.location.pathname.includes('index.html') && 
                   !window.location.pathname.includes('admin.html')) {
            window.location.href = 'login.html';
        }
    });
}

// Login do inquilino
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const cpf = document.getElementById('cpf').value;
            const senha = document.getElementById('senha').value;
            
            auth.signInWithEmailAndPassword(`${cpf}@alugueis.com`, senha)
                .then((userCredential) => {
                    window.location.href = 'inquilino.html';
                })
                .catch((error) => {
                    alert('CPF ou senha incorretos!');
                    console.error(error);
                });
        });
    }
    
    // Logout
    if (document.getElementById('btnLogout')) {
        document.getElementById('btnLogout').addEventListener('click', function() {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }
    
    if (document.getElementById('btnLogoutAdmin')) {
        document.getElementById('btnLogoutAdmin').addEventListener('click', function() {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });
    }
    
    verificarAutenticacao();
});
