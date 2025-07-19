// 2. Upsert del perfil (asegura que la fila exista y se actualice)
    if (profileToSave && typeof profileToSave.credits === 'number') {
      promises.push(
        supabase
          .from('profiles')
          .upsert(
            {
              id: user.sub,
              credits: profileToSave.credits,
              gamification_state: profileToSave.gamificationState || {},
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          )
      );
    }
