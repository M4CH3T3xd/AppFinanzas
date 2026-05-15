import { useEffect } from 'react'

export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out max-w-lg mx-auto ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-panel rounded-t-3xl">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-line" />
          </div>
          {title && (
            <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-line">
              <h3 className="font-semibold text-ink text-base">{title}</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-well flex items-center justify-center text-dim hover:text-ink text-sm">✕</button>
            </div>
          )}
          <div className="px-5 py-4 pb-8">{children}</div>
        </div>
      </div>
    </>
  )
}
