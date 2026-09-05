import { supabase } from './supabaseClient'
import { App } from '@capacitor/app'
import { sessionTimeoutService } from './sessionTimeoutService'

const GOOGLE_CLIENT_ID = '833136604965-vhbj0lutqsqc7vraquadp3bcjatis4cf.apps.googleusercontent.com'

export const authService = {
  // Sign Up with Email and Password
  async signUp(email, password, displayName) {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : 'https://kancasela.my.id'
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
        emailRedirectTo: redirectTo
      },
    })
    if (error) throw error
    if (data?.session) {
      sessionTimeoutService.setLastActivity()
    }
    return data
  },

  // Sign In with Email and Password
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    sessionTimeoutService.setLastActivity()
    return data
  },

  // Sign In with Google ID Token (Native Google One Tap / In-Page GIS)
  async signInWithGoogleIdToken(idToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error
    sessionTimeoutService.setLastActivity()
    return data
  },

  // Render Official Google Sign-In Button on Page (No gibberish redirect URL!)
  renderGoogleButton(containerElement, onSuccess, onError) {
    if (typeof window === 'undefined' || !containerElement) return

    const render = () => {
      if (!window.google?.accounts?.id) return

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            try {
              if (response.credential) {
                const data = await authService.signInWithGoogleIdToken(response.credential)
                if (onSuccess) onSuccess(data)
              }
            } catch (err) {
              console.error('Google One Tap Auth Error:', err)
              if (onError) onError(err)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(containerElement, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          width: 320,
          text: 'continue_with',
          logo_alignment: 'left',
        })
      } catch (e) {
        console.warn('Google GSI init failed:', e)
      }
    }

    if (window.google?.accounts?.id) {
      render()
    } else {
      // Retry in 300ms if script is still loading
      setTimeout(render, 300)
    }
  },

  // Fallback: Standard Google OAuth Redirect
  async signInWithGoogle() {
    const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()
    const redirectTo = isNative
      ? 'com.kancasela.app://login-callback'
      : window.location.origin

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      },
    })
    if (error) throw error
    return data
  },

  // Sign Out
  async signOut() {
    sessionTimeoutService.clearLastActivity()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Listen to Auth State Changes
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
    return subscription
  },

  // Get Current Authenticated User & Profile (Auto-Provision)
  async getCurrentUser() {
    if (sessionTimeoutService.isSessionExpired()) {
      await authService.signOut()
      return null
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    if (!sessionTimeoutService.getLastActivity()) {
      sessionTimeoutService.setLastActivity()
    }

    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Player'
      const newProfile = {
        id: user.id,
        display_name: displayName,
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'user',
        is_pro: false,
        subscription_tier: 'free',
      }
      try {
        const { data: created } = await supabase
          .from('profiles')
          .upsert([newProfile])
          .select()
          .maybeSingle()
        profile = created || newProfile
      } catch (err) {
        console.warn('Profile upsert warning:', err)
        profile = newProfile
      }
    }

    return {
      ...user,
      profile
    }
  },

  // Check whether a user is an active Pro / Ad-Free subscriber
  isUserPro(user) {
    if (!user) return false
    const profile = user.profile || user
    if (profile.role === 'admin') return true // Admins are always ad-free
    if (profile.is_pro === true) return true
    if (profile.subscription_tier === 'pro' || profile.subscription_tier === 'venue') return true
    if (profile.pro_expires_at) {
      try {
        return new Date(profile.pro_expires_at).getTime() > Date.now()
      } catch {
        return false
      }
    }
    return false
  },

  // Mobile Deep Link Handler (Capacitor)
  initMobileDeepLinks() {
    if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform()) return

    App.addListener('appUrlOpen', async (data) => {
      const url = new URL(data.url)
      if (url.host === 'login-callback') {
        const hash = url.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
        }
      }
    })
  }
}
