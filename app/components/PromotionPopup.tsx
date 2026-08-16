import { useState, useEffect } from "react";
import { PiTelegramLogoBold } from "react-icons/pi";
import { RiExternalLinkLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import telegramBanner from "@/src/assets/telegram-community-banner.png.asset.json";

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
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisible(false)}
            className="absolute right-3 top-3 z-20 rounded-full bg-background/80 text-foreground backdrop-blur hover:bg-accent"
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
          </Button>

          {/* Content */}
          <div className="flex flex-col items-center px-5 pb-5 pt-14 text-center sm:px-6">
            <div className="mb-5 w-full overflow-hidden rounded-lg border border-border bg-muted">
              <img
                src={promotion.imageUrl || telegramBanner.url}
                alt="Telegram community banner"
                className="aspect-[16/9] w-full object-cover grayscale dark:brightness-75"
              />
            </div>

            {/* Title */}
            <h2 className="mb-3 text-2xl font-extrabold text-foreground">
              {promotion.title || "Join Telegram Community!"}
            </h2>

            {/* Message */}
            {promotion.message && (
              <p className="mb-6 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                {promotion.message}
              </p>
            )}

            {/* Join Button */}
            {finalLink && (
              <Button asChild size="lg" className="w-full font-bold">
                <a href={finalLink} target="_blank" rel="noopener noreferrer">
                  <PiTelegramLogoBold className="h-5 w-5" />
                  <span>
                  {promotion.button?.Name || "Join Community Now"}
                  </span>
                  <RiExternalLinkLine className="h-4 w-4 opacity-80" />
                </a>
              </Button>
            )}

            {/* Maybe Later */}
            <Button
              variant="ghost"
              onClick={() => setVisible(false)}
              className="mt-3 text-muted-foreground"
            >
              Maybe Later
            </Button>
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