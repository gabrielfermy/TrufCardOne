/**
 * 9:16 Social Media Story Card Generator & Web Share Service
 * Formats match summaries for WhatsApp Status, Instagram Stories, and TikTok
 */
export const shareService = {
  /**
   * Generates a 9:16 Story Card on an HTML5 Canvas
   * @param {Object} data { gameType, title, hostName, date, players: [{ name, score, rank, tag }] }
   * @returns {Promise<Blob>}
   */
  generateStoryCardBlob: async (data) => {
    const width = 1080
    const height = 1920
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    // 1. Background Gradient (Deep Indigo & Charcoal)
    const bgGradient = ctx.createLinearGradient(0, 0, width, height)
    bgGradient.addColorStop(0, '#0D0E15')
    bgGradient.addColorStop(0.5, '#161928')
    bgGradient.addColorStop(1, '#090A0F')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // 2. Ambient Neon Glow Spheres
    ctx.save()
    const glow1 = ctx.createRadialGradient(width * 0.2, height * 0.2, 50, width * 0.2, height * 0.2, 500)
    glow1.addColorStop(0, 'rgba(139, 92, 246, 0.25)')
    glow1.addColorStop(1, 'rgba(139, 92, 246, 0)')
    ctx.fillStyle = glow1
    ctx.fillRect(0, 0, width, height)

    const glow2 = ctx.createRadialGradient(width * 0.8, height * 0.7, 50, width * 0.8, height * 0.7, 600)
    glow2.addColorStop(0, 'rgba(59, 130, 246, 0.2)')
    glow2.addColorStop(1, 'rgba(59, 130, 246, 0)')
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // 3. Top Header: App Branding
    ctx.textAlign = 'center'
    ctx.fillStyle = '#8B5CF6'
    ctx.font = 'bold 36px sans-serif'
    ctx.letterSpacing = '4px'
    ctx.fillText('KANCASELA', width / 2, 140)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 68px sans-serif'
    ctx.fillText((data.gameType || 'MATCH RESULT').toUpperCase(), width / 2, 230)

    ctx.fillStyle = '#94A3B8'
    ctx.font = '32px sans-serif'
    ctx.fillText(`${data.date || new Date().toLocaleDateString()} • ${data.hostName ? `Host: ${data.hostName}` : 'Match Result'}`, width / 2, 290)

    // 4. Champion Gold Badge Box
    const winner = data.players && data.players[0] ? data.players[0] : { name: 'Player', score: 0 }
    const badgeY = 380
    const badgeW = 920
    const badgeH = 460
    const badgeX = (width - badgeW) / 2

    // Card background with border
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.strokeStyle = '#F59E0B'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 32)
    ctx.fill()
    ctx.stroke()

    // Crown Icon & Glow
    ctx.font = '84px sans-serif'
    ctx.fillText('👑', width / 2, badgeY + 110)

    ctx.fillStyle = '#F59E0B'
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText('JUARA 1 / CHAMPION', width / 2, badgeY + 175)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 64px sans-serif'
    ctx.fillText(winner.name, width / 2, badgeY + 270)

    ctx.fillStyle = '#34D399'
    ctx.font = 'bold 44px sans-serif'
    ctx.fillText(`${winner.score > 0 ? `+${winner.score}` : winner.score} Poin`, width / 2, badgeY + 350)

    if (winner.tag) {
      ctx.fillStyle = '#FBBF24'
      ctx.font = '30px sans-serif'
      ctx.fillText(`✨ ${winner.tag}`, width / 2, badgeY + 410)
    }
    ctx.restore()

    // 5. Leaderboard / Runner-ups Table
    let tableY = 900
    ctx.fillStyle = '#E2E8F0'
    ctx.font = 'bold 40px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('KLASEMEN AKHIR', badgeX + 10, tableY)

    tableY += 40
    const runners = (data.players || []).slice(1)
    runners.forEach((p, idx) => {
      const rowY = tableY + idx * 130
      const rowW = badgeW
      const rowH = 105

      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(badgeX, rowY, rowW, rowH, 20)
      ctx.fill()
      ctx.stroke()

      // Rank Medal
      ctx.fillStyle = idx === 0 ? '#94A3B8' : idx === 1 ? '#CD7F32' : '#64748B'
      ctx.font = 'bold 40px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`#${idx + 2}`, badgeX + 60, rowY + 68)

      // Player Name
      ctx.fillStyle = '#F8FAFC'
      ctx.font = 'bold 38px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(p.name, badgeX + 130, rowY + 68)

      // Player Score
      ctx.fillStyle = p.score >= 0 ? '#38BDF8' : '#F87171'
      ctx.font = 'bold 38px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${p.score > 0 ? `+${p.score}` : p.score} Pts`, badgeX + rowW - 40, rowY + 68)

      ctx.restore()
    })

    // 6. Bottom Footer & Watermark
    ctx.textAlign = 'center'
    ctx.fillStyle = '#64748B'
    ctx.font = '28px sans-serif'
    ctx.fillText('Dicatat dengan KancaSela', width / 2, height - 120)

    ctx.fillStyle = '#8B5CF6'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText('gns.avl.my.id', width / 2, height - 70)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/png')
    })
  },

  /**
   * Share via Native Web Share API or download fallback
   */
  shareStoryCard: async (data) => {
    try {
      const blob = await shareService.generateStoryCardBlob(data)
      if (!blob) return

      const file = new File([blob], `kancasela-${Date.now()}.png`, { type: 'image/png' })

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `KancaSela: ${data.gameType || 'Match Result'}`,
          text: `Juara hari ini: ${data.players?.[0]?.name || 'Player'}! 🏆 #KancaSela`
        })
      } else {
        // Fallback: Download directly
        await shareService.downloadStoryCard(data)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share story card error', err)
      }
    }
  },

  /**
   * Directly download story card image file (PNG)
   */
  downloadStoryCard: async (data) => {
    try {
      const blob = await shareService.generateStoryCardBlob(data)
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kancasela-${(data.gameType || 'story').toLowerCase()}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download story card error', err)
    }
  }
}
