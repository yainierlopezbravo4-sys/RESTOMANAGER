  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Intentamos buscar los datos del usuario
          const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q).catch(() => null); // Si no hay permiso, devolvemos null
          
          let userData = null;
          if (querySnapshot && !querySnapshot.empty) {
            userData = querySnapshot.docs[0].data();
          }

          // Si tu email es el del dueño, te ponemos como admin pase lo que pase
          const isOwnerEmail = firebaseUser.email === "yainierlopezbravo4@gmail.com";

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: userData?.displayName || firebaseUser.displayName || "Usuario",
            photoURL: firebaseUser.photoURL,
            role: isOwnerEmail ? 'admin' : (userData?.role || 'staff')
          });
        } catch (error) {
          console.error('Error silencioso de permisos:', error);
          // Si falla, entramos con datos básicos para no romper la app
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: firebaseUser.email === "yainierlopezbravo4@gmail.com" ? 'admin' : 'staff'
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [t]);

