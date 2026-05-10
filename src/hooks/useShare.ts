import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { encodeShare } from '../storage'

export function useShare(source: string) {
  const [qrSvg, setQrSvg] = useState<string | null>(null)
  const [printQrSvg, setPrintQrSvg] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      const encoded = await encodeShare(source)
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`
      setShareUrl(url)
      try {
        const [screenSvg, printSvg] = await Promise.all([
          QRCode.toString(url, {
            type: 'svg',
            width: 160,
            margin: 1,
            color: { dark: '#000', light: '#fff' },
          }),
          QRCode.toString(url, {
            type: 'svg',
            width: 150,
            margin: 1,
            color: { dark: '#000', light: '#fff' },
          }),
        ])
        setQrSvg(screenSvg)
        setPrintQrSvg(printSvg)
      } catch {
        setQrSvg(null)
        setPrintQrSvg(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [source])

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return { shareUrl, qrSvg, printQrSvg, copied, copyToClipboard }
}
