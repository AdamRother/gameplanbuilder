export function isSpeechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  )
}

export function createRecognition(): any {
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return null
  const rec = new SR()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = 'en-US'
  return rec
}

export async function loadPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()

  const pdfjsLib = (window as any).pdfjsLib
  if (!pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load pdf.js'))
      document.head.appendChild(script)
    })
    ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }

  const lib = (window as any).pdfjsLib
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item: any) => item.str).join(' ') + '\n'
  }
  return text
}
