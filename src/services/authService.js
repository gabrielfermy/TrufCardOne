import { supabase } from './supabaseClient'
import { App } from '@capacitor/app'

const GOOGLE_CLIENT_ID = '833136604965-vhbj0lutqsqc7vraquadp3bcjatis4cf.apps.googleusercontent.com'

export const authService = {
  // Sign Up with Email and Password
  async signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    })
    if (error) throw error
    return data
  },

  // Sign In with Email and Password
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  },

  // Sign In with Google ID Token (Native Google One Tap / In-Page GIS)
  async signInWithGoogleIdToken(idToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error
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
      ? 'com.trufcard.gamenight://login-callback'
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

  // Get Current Authenticated User & Profile
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return {
      ...user,
      profile: profile || {
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'user',
      }
    }
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
