// ✅ Si el perfil no existe aún (usuario nuevo), lo creamos con 100 créditos iniciales
    if (profileResult.error && profileResult.error.code === 'PGRST116') {
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.sub,
          credits: 100, // ✅ SOLUCIÓN: Se otorgan 100 créditos iniciales
          gamification_state: {},
          last_credit_month: currentMonth,
          last_credits_granted_at: now,
          updated_at: now
        });

      if (insertError) throw insertError;

      // Creamos el objeto del perfil para retornarlo inmediatamente al frontend
      profileResult.data = {
        credits: 100, // ✅ Y AQUÍ TAMBIÉN: Se devuelve el valor correcto
        gamification_state: {},
        last_credit_month: currentMonth,
        last_credits_granted_at: now
      };
    } else if (profileResult.error) {
      throw profileResult.error;
    }
