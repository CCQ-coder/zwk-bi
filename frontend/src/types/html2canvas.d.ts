declare module 'html2canvas' {
  interface Html2CanvasOptions {
    backgroundColor?: string | null
    useCORS?: boolean
    logging?: boolean
    scale?: number
    x?: number
    y?: number
    width?: number
    height?: number
    scrollX?: number
    scrollY?: number
    windowWidth?: number
    windowHeight?: number
  }

  export default function html2canvas(element: HTMLElement, options?: Html2CanvasOptions): Promise<HTMLCanvasElement>
}