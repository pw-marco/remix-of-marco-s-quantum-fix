import { useState, useEffect } from "react";
import { PiTelegramLogoBold } from "react-icons/pi";
import { RiExternalLinkLine } from "react-icons/ri";

interface Button {
  Name: string;
  Link: string;
}

interface Promotion {
  title: string;
  message?: string;
  imageUrl?: string;
  button?: Button;
}

interface Props {
  promotion: Promotion | null;
}

// ✅ Helper: Auto-fix telegram links
const normalizeLink = (link: string): string => {
  if (!link) return "";
  const trimmed = link.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleanUsername = trimmed.replace(/^@/, "");
  return `https://t.me/${cleanUsername}`;
};

const PromotionPopup: React.FC<Props> = ({ promotion }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!promotion || !visible) return null;

  const finalLink = normalizeLink(promotion.button?.Link || "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={() => setVisible(false)}
      >
        {/* Popup Card - BRIGHT WHITE SOLID */}
        <div
          className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
          style={{
            background: `
              linear-gradient(135deg, #ffffff 0%, #f0f7ff 50%, #ffffff 100%)
            `,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => setVisible(false)}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all text-slate-600 hover:rotate-90 duration-300"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
            {/* Animated Telegram Icon */}
            <div className="relative mb-6 animate-float">
              {/* Glow rings */}
              <div className="absolute inset-0 rounded-full bg-blue-400/40 blur-xl scale-125 animate-pulse-slow" />
              <div className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl scale-150 animate-pulse-slow" />

              {/* Icon Circle */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#3aa9f0] to-[#1e88e5] flex items-center justify-center shadow-lg shadow-blue-500/40">
                <PiTelegramLogoBold className="w-10 h-10 text-white -ml-1" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-3">
              {promotion.title || "Join Telegram Community!"}{" "}
              <span className="inline-block animate-rocket">🚀</span>
            </h2>

            {/* Message */}
            {promotion.message && (
              <p className="text-slate-500 text-[15px] leading-relaxed max-w-[300px] mb-7">
                {promotion.message}
              </p>
            )}

            {/* Join Button */}
            {finalLink && (
              <a
                href={finalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#3aa9f0] to-[#1e88e5] hover:from-[#2196f3] hover:to-[#1976d2] text-white font-bold text-[15px] py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <PiTelegramLogoBold className="w-5 h-5 relative z-10" />
                <span className="relative z-10">
                  {promotion.button?.Name || "Join Community Now"}
                </span>
                <RiExternalLinkLine className="w-4 h-4 relative z-10 opacity-90" />
              </a>
            )}

            {/* Maybe Later */}
            <button
              onClick={() => setVisible(false)}
              className="mt-4 text-slate-500 hover:text-slate-700 font-semibold text-sm py-2 px-4 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1.25);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.4);
          }
        }
        @keyframes rocket {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-4px) rotate(-8deg);
          }
          75% {
            transform: translateY(-2px) rotate(8deg);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2.5s ease-in-out infinite;
        }
        .animate-rocket {
          animation: rocket 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default PromotionPopup;