// admin-login.js
class AdminAuth {
    constructor() {
        this.admin = null;
        this.initFirebase();
    }

    initFirebase() {
        // Configuração do Firebase (já deve existir no seu projeto)
        const firebaseConfig = {
            apiKey: "sua-api-key",
            authDomain: "seu-projeto.firebaseapp.com",
            databaseURL: "https://seu-projeto.firebaseio.com",
            projectId: "seu-projeto",
            storageBucket: "seu-projeto.appspot.com",
            messagingSenderId: "seu-sender-id",
            appId: "seu-app-id"
        };
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
    }

    // Login do administrador
    async loginAdmin(email, password) {
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Verificar se o usuário é administrador
            const isAdmin = await this.checkIfAdmin(user.uid);
            
            if (isAdmin) {
                this.admin = user;
                localStorage.setItem('adminAuth', 'true');
                localStorage.setItem('adminUID', user.uid);
                return { success: true, user: user };
            } else {
                await firebase.auth().signOut();
                return { success: false, error: "Acesso não autorizado" };
            }
        } catch (error) {
            console.error("Erro no login:", error);
            return { success: false, error: error.message };
        }
    }

    // Verificar se o usuário é administrador
    async checkIfAdmin(uid) {
        try {
            const snapshot = await firebase.database().ref('administradores/' + uid).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error("Erro ao verificar admin:", error);
            return false;
        }
    }

    // Verificar autenticação ao carregar a página
    async checkAuth() {
        const adminAuth = localStorage.getItem('adminAuth');
        const adminUID = localStorage.getItem('adminUID');
        
        if (adminAuth && adminUID) {
            const isAdmin = await this.checkIfAdmin(adminUID);
            if (isAdmin) {
                this.admin = { uid: adminUID };
                return true;
            }
        }
        
        return false;
    }

    // Logout
    logout() {
        firebase.auth().signOut();
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('adminUID');
        this.admin = null;
        window.location.href = 'admin-login.html';
    }
}

// Inicializar
const adminAuth = new AdminAuth();