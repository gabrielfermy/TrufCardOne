import { supabase } from './supabaseClient'
import { App } from '@capacitor/app'

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

  // Sign In with Google OAuth SSO (supports Web & Capacitor Deep Linking)
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

  // Get Current Active User with Profile Data (role, display_name)
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return null

      // Fetch profile role and display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      return {
        ...user,
        profile: profile || {
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player',
          role: 'user'
        }
      }
    } catch {
      return null
    }
  },

  // Initialize Mobile Deep Linking for OAuth Callbacks
  initMobileDeepLinks() {
    try {
      App.addListener('appUrlOpen', async (data) => {
        if (data.url.includes('login-callback') || data.url.includes('#access_token=')) {
          const url = new URL(data.url)
          const hashParams = new URLSearchParams(url.hash.replace('#', '?'))
          const accessToken = hashParams.get('access_token') || url.searchParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token') || url.searchParams.get('refresh_token')

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
          }
        }
      })
    } catch {
      // In web browser, ignore Capacitor listener errors
    }
  }
}
