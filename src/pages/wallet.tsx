import { useState, useEffect, useCallback } from "react";
import { useMeta } from "../lib/use-meta";
import { auth } from "../lib/firebase";
import {
  Wallet, Plus, ArrowRight, ArrowLeft, CheckCircle2, Clock, Loader2, ExternalLink,
  User, Mail, Phone, RefreshCw, XCircle, History, AlertCircle, Sparkles, Receipt,
  TrendingUp, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../lib/auth-context";
import { getCurrency, formatLocalAmount } from "../lib/currencies";

/* ────────────────────────────────────────────────────────────────── */
/* Constantes                                                         */
/* ────────────────────────────────────────────────────────────────── */

const MIN_AMOUNT = 1.65;
const PRESET_AMOUNTS = [2, 5, 10, 20];

const BRAND = {
  primary: "#C55A34",
  primaryDark: "#A84A28",
  primaryLight: "#E8A47F",
  primarySoft: "#FBEEE7",
};

/* ────────────────────────────────────────────────────────────────── */
/* Types                                                              */
/* ────────────────────────────────────────────────────────────────── */

export interface Topup {
  id: string;
  amountEur: number | string;
  status: string;
  createdAt: string;
}

interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  balance: number;
  currency?: string;
}

/* ────────────────────────────────────────────────────────────────── */
/* Salutations & SVG animés contextuels                               */
/* ────────────────────────────────────────────────────────────────── */

type TimeSlot = "night" | "morning" | "afternoon" | "evening";

function getTimeSlot(): TimeSlot {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return "night";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function SleepingCatSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <radialGradient id="wNightSky" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0" stopColor="#2d3f72" />
            <stop offset="1" stopColor="#1a2547" />
          </radialGradient>
          <linearGradient id="wCatFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <linearGradient id="wCatEar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4a76b" />
            <stop offset="1" stopColor="#d98848" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes wCatBreathe { 0%,100%{transform:scale(1) translateY(0)} 50%{transform:scale(1.025,1.015) translateY(-1px)} }
          @keyframes wFloatZ1 { 0%{opacity:0;transform:translate(0,0) scale(.5)} 25%{opacity:1;transform:translate(4px,-14px) scale(.8)} 100%{opacity:0;transform:translate(10px,-34px) scale(1.1)} }
          @keyframes wFloatZ2 { 0%{opacity:0;transform:translate(0,0) scale(.5)} 25%{opacity:1;transform:translate(6px,-16px) scale(.9)} 100%{opacity:0;transform:translate(14px,-38px) scale(1.2)} }
          @keyframes wFloatZ3 { 0%{opacity:0;transform:translate(0,0) scale(.6)} 25%{opacity:1;transform:translate(8px,-18px) scale(1)} 100%{opacity:0;transform:translate(18px,-42px) scale(1.35)} }
          @keyframes wTwinkle { 0%,100%{opacity:.25} 50%{opacity:1} }
          @keyframes wMoonGlow { 0%,100%{opacity:.7} 50%{opacity:1} }
          .wCatBody { animation: wCatBreathe 3.4s ease-in-out infinite; transform-origin: 60px 76px; }
          .wz1 { animation: wFloatZ1 3s ease-out infinite; }
          .wz2 { animation: wFloatZ2 3s ease-out infinite .9s; }
          .wz3 { animation: wFloatZ3 3s ease-out infinite 1.8s; }
          .wStarA { animation: wTwinkle 2.2s ease-in-out infinite; }
          .wStarB { animation: wTwinkle 2.2s ease-in-out infinite .8s; }
          .wStarC { animation: wTwinkle 2.2s ease-in-out infinite 1.5s; }
          .wMoon { animation: wMoonGlow 4s ease-in-out infinite; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#wNightSky)" />
        <circle className="wStarA" cx="24" cy="28" r="1.2" fill="#fef3c7" />
        <circle className="wStarB" cx="92" cy="22" r="1.5" fill="#fef3c7" />
        <circle className="wStarC" cx="98" cy="52" r="1" fill="#fef3c7" />
        <circle className="wStarA" cx="18" cy="52" r="0.9" fill="#fef3c7" />
        <circle className="wStarB" cx="80" cy="14" r="1" fill="#fef3c7" />
        <g className="wMoon">
          <circle cx="94" cy="32" r="8" fill="#fef3c7" />
          <circle cx="97" cy="29" r="7" fill="#1a2547" />
        </g>
        <ellipse cx="60" cy="98" rx="42" ry="8" fill="#0f1833" opacity="0.7" />
        <g className="wCatBody">
          <ellipse cx="58" cy="82" rx="32" ry="18" fill="url(#wCatFur)" />
          <path d="M38 76 Q44 82 40 88" stroke="#c9723a" strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" />
          <path d="M48 74 Q54 82 48 90" stroke="#c9723a" strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" />
          <path d="M88 82 Q98 80 100 88 Q98 94 92 92" stroke="url(#wCatFur)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="78" rx="16" ry="14" fill="url(#wCatFur)" />
          <path d="M28 68 L26 60 L34 66 Z" fill="url(#wCatEar)" />
          <path d="M46 68 L52 60 L48 70 Z" fill="url(#wCatEar)" />
          <path d="M31 78 Q34 81 37 78" stroke="#3a2417" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M41 78 Q44 81 47 78" stroke="#3a2417" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M38 84 L37 86 L39 86 Z" fill="#d98848" />
          <path d="M38 86 Q36 88 34 87" stroke="#3a2417" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M38 86 Q40 88 42 87" stroke="#3a2417" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M24 82 L16 80" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M24 85 L16 86" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <ellipse cx="30" cy="84" rx="3" ry="1.8" fill="#f4a76b" opacity="0.6" />
          <ellipse cx="46" cy="84" rx="3" ry="1.8" fill="#f4a76b" opacity="0.6" />
        </g>
        <g fontFamily="ui-rounded, system-ui" fontWeight="900" fill="#fbbf24">
          <text className="wz1" x="72" y="60" fontSize="11">Z</text>
          <text className="wz2" x="78" y="58" fontSize="13">Z</text>
          <text className="wz3" x="86" y="56" fontSize="15">Z</text>
        </g>
      </svg>
    </div>
  );
}

function MorningCatSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <radialGradient id="wMornSky" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#fb923c" />
          </radialGradient>
          <linearGradient id="wMornFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <linearGradient id="wSunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fef08a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes wSunRise { 0%{transform:translateY(8px);opacity:.6} 100%{transform:translateY(0);opacity:1} }
          @keyframes wCatStretch { 0%,100%{transform:scale(1) rotate(0)} 50%{transform:scale(1.02,1.03) rotate(-1deg)} }
          @keyframes wTailWag { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-6deg)} }
          @keyframes wBlink { 0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
          @keyframes wRayRotate { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
          .wSun { animation: wSunRise 1.4s ease-out; transform-origin: 60px 78px; }
          .wCatStretch { animation: wCatStretch 3s ease-in-out infinite; transform-origin: 60px 82px; }
          .wTail { animation: wTailWag 1.8s ease-in-out infinite; transform-origin: 88px 84px; }
          .wEye { animation: wBlink 5s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
          .wRays { animation: wRayRotate 30s linear infinite; transform-origin: 60px 78px; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#wMornSky)" />
        <g className="wRays" opacity="0.35">
          <line x1="60" y1="78" x2="60" y2="30" stroke="#fff7ed" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="78" x2="82" y2="40" stroke="#fff7ed" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="78" x2="38" y2="40" stroke="#fff7ed" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="78" x2="90" y2="70" stroke="#fff7ed" strokeWidth="2" strokeLinecap="round" />
          <line x1="60" y1="78" x2="30" y2="70" stroke="#fff7ed" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="wSun"><circle cx="60" cy="78" r="24" fill="url(#wSunGrad)" /></g>
        <path d="M22 26 Q25 23 28 26" stroke="#7c2d12" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M32 20 Q35 17 38 20" stroke="#7c2d12" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
        <ellipse cx="60" cy="100" rx="46" ry="6" fill="#7c2d12" opacity="0.25" />
        <g className="wCatStretch">
          <path className="wTail" d="M88 84 Q100 80 102 88" stroke="url(#wMornFur)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M30 88 Q40 70 60 74 Q78 78 88 86 L88 94 Q60 96 30 94 Z" fill="url(#wMornFur)" />
          <rect x="26" y="86" width="14" height="4" rx="2" fill="url(#wMornFur)" />
          <rect x="26" y="90" width="14" height="4" rx="2" fill="#e89456" />
          <ellipse cx="42" cy="72" rx="14" ry="12" fill="url(#wMornFur)" />
          <path d="M32 62 L30 54 L38 60 Z" fill="url(#wMornFur)" />
          <path d="M50 62 L56 54 L52 64 Z" fill="url(#wMornFur)" />
          <ellipse className="wEye" cx="36" cy="72" rx="1.8" ry="2.2" fill="#3a2417" />
          <ellipse className="wEye" cx="48" cy="72" rx="1.8" ry="2.2" fill="#3a2417" />
          <path d="M42 78 L41 80 L43 80 Z" fill="#d98848" />
          <ellipse cx="34" cy="78" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.5" />
          <ellipse cx="50" cy="78" rx="2.5" ry="1.5" fill="#fb923c" opacity="0.5" />
          <path d="M28 76 L20 74" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M28 80 L20 81" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function AfternoonCatSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <linearGradient id="wAftSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#93c5fd" />
            <stop offset="1" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="wAftFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
        </defs>
        <style>{`
          @keyframes wPawPlay { 0%,100%{transform:translate(0,0) rotate(0)} 50%{transform:translate(2px,-6px) rotate(-8deg)} }
          @keyframes wBallBounce { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-3px,-5px)} }
          @keyframes wTailIdle { 0%,100%{transform:rotate(0)} 40%{transform:rotate(-8deg)} 70%{transform:rotate(5deg)} }
          @keyframes wCloudDrift { 0%{transform:translateX(0)} 100%{transform:translateX(15px)} }
          @keyframes wSunWarm { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
          .wPaw { animation: wPawPlay 1.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
          .wBall { animation: wBallBounce 1.6s ease-in-out infinite; }
          .wTailIdle { animation: wTailIdle 2.4s ease-in-out infinite; transform-origin: 88px 88px; }
          .wCloud { animation: wCloudDrift 6s ease-in-out infinite alternate; }
          .wSunWarm { animation: wSunWarm 4s ease-in-out infinite; transform-origin: 90px 28px; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#wAftSky)" />
        <g className="wCloud" opacity="0.85">
          <ellipse cx="30" cy="30" rx="12" ry="5" fill="#ffffff" />
          <ellipse cx="38" cy="28" rx="9" ry="6" fill="#ffffff" />
          <ellipse cx="24" cy="29" rx="7" ry="4.5" fill="#ffffff" />
        </g>
        <g className="wSunWarm">
          <circle cx="90" cy="28" r="10" fill="#fbbf24" />
          <circle cx="90" cy="28" r="7" fill="#fcd34d" />
        </g>
        <ellipse cx="60" cy="100" rx="46" ry="6" fill="#78716c" opacity="0.2" />
        <g className="wBall">
          <circle cx="26" cy="90" r="7" fill="#ef4444" />
          <path d="M26 84 Q32 90 26 96" stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.7" />
          <path d="M20 90 Q26 88 32 90" stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.7" />
        </g>
        <g>
          <path className="wTailIdle" d="M86 88 Q98 82 100 92" stroke="url(#wAftFur)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M52 92 Q48 74 62 68 Q80 66 84 84 Q86 92 84 96 L52 96 Z" fill="url(#wAftFur)" />
          <ellipse cx="80" cy="94" rx="9" ry="4" fill="url(#wAftFur)" />
          <rect x="56" y="88" width="6" height="10" rx="3" fill="url(#wAftFur)" />
          <rect x="66" y="88" width="6" height="10" rx="3" fill="url(#wAftFur)" />
          <g className="wPaw">
            <path d="M52 90 Q40 84 34 88" stroke="url(#wAftFur)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <ellipse cx="34" cy="88" rx="3.5" ry="3" fill="url(#wAftFur)" />
          </g>
          <ellipse cx="58" cy="58" rx="16" ry="15" fill="url(#wAftFur)" />
          <path d="M46 48 L44 38 L54 46 Z" fill="url(#wAftFur)" />
          <path d="M68 48 L74 38 L70 50 Z" fill="url(#wAftFur)" />
          <ellipse cx="52" cy="58" rx="2.6" ry="3.2" fill="#ffffff" />
          <ellipse cx="64" cy="58" rx="2.6" ry="3.2" fill="#ffffff" />
          <circle cx="52.5" cy="58.5" r="1.6" fill="#1f2937" />
          <circle cx="64.5" cy="58.5" r="1.6" fill="#1f2937" />
          <circle cx="53" cy="57.5" r="0.5" fill="#ffffff" />
          <circle cx="65" cy="57.5" r="0.5" fill="#ffffff" />
          <path d="M57 66 L56 68 L59 68 Z" fill="#d98848" />
          <path d="M58 68 Q55 71 53 69" stroke="#3a2417" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M58 68 Q61 71 63 69" stroke="#3a2417" strokeWidth="1" fill="none" strokeLinecap="round" />
          <ellipse cx="46" cy="66" rx="3" ry="1.8" fill="#fb923c" opacity="0.5" />
          <ellipse cx="70" cy="66" rx="3" ry="1.8" fill="#fb923c" opacity="0.5" />
          <path d="M42 64 L32 62" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M42 67 L32 68" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M74 64 L84 62" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          <path d="M74 67 L84 68" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

function EveningCatSVG() {
  return (
    <div className="relative w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <defs>
          <linearGradient id="wEveSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="0.5" stopColor="#f472b6" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="wEveFur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd4a8" />
            <stop offset="1" stopColor="#f4a76b" />
          </linearGradient>
          <radialGradient id="wEveSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fef08a" />
            <stop offset="1" stopColor="#f59e0b" />
          </radialGradient>
        </defs>
        <style>{`
          @keyframes wSunSet { 0%,100%{transform:translateY(0)} 50%{transform:translateY(2px)} }
          @keyframes wTailSway { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-5deg)} }
          @keyframes wHeadNod { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1px)} }
          @keyframes wStarFade { 0%,100%{opacity:0} 40%,60%{opacity:.9} }
          @keyframes wBirdFly { 0%{transform:translate(0,0)} 100%{transform:translate(20px,-4px)} }
          .wSunSet { animation: wSunSet 5s ease-in-out infinite; transform-origin: 60px 78px; }
          .wTailSway { animation: wTailSway 3s ease-in-out infinite; transform-origin: 84px 90px; }
          .wHeadNod { animation: wHeadNod 3s ease-in-out infinite; }
          .wStar { animation: wStarFade 5s ease-in-out infinite; }
          .wBird1 { animation: wBirdFly 4s ease-in-out infinite alternate; }
        `}</style>
        <circle cx="60" cy="60" r="52" fill="url(#wEveSky)" />
        <circle className="wStar" cx="22" cy="22" r="1.2" fill="#ffffff" />
        <circle className="wStar" cx="98" cy="30" r="1" fill="#ffffff" />
        <g className="wBird1" opacity="0.75">
          <path d="M30 24 Q33 21 36 24" stroke="#7c2d12" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M40 18 Q43 15 46 18" stroke="#7c2d12" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </g>
        <g className="wSunSet"><circle cx="60" cy="78" r="22" fill="url(#wEveSun)" /></g>
        <ellipse cx="60" cy="100" rx="46" ry="8" fill="#7c2d12" opacity="0.35" />
        <g>
          <path className="wTailSway" d="M84 92 Q96 88 98 96" stroke="url(#wEveFur)" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M56 94 Q54 76 66 70 Q82 68 84 88 Q84 94 82 98 L56 98 Z" fill="url(#wEveFur)" />
          <ellipse cx="80" cy="96" rx="8" ry="3.5" fill="url(#wEveFur)" />
          <rect x="58" y="90" width="5" height="8" rx="2.5" fill="url(#wEveFur)" />
          <g className="wHeadNod">
            <ellipse cx="62" cy="60" rx="15" ry="14" fill="url(#wEveFur)" />
            <path d="M50 50 L48 40 L58 48 Z" fill="url(#wEveFur)" />
            <path d="M72 50 L78 40 L74 52 Z" fill="url(#wEveFur)" />
            <ellipse cx="56" cy="60" rx="2.4" ry="3" fill="#ffffff" />
            <circle cx="56.3" cy="60.5" r="1.5" fill="#1f2937" />
            <circle cx="56.6" cy="59.7" r="0.45" fill="#ffffff" />
            <circle cx="55.4" cy="60" r="0.4" fill="#fbbf24" />
            <path d="M60 66 L59 68 L62 68 Z" fill="#d98848" />
            <path d="M61 68 Q58 70 56 69" stroke="#3a2417" strokeWidth="1" fill="none" strokeLinecap="round" />
            <ellipse cx="58" cy="66" rx="3" ry="1.8" fill="#fb923c" opacity="0.55" />
            <path d="M48 64 L38 62" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
            <path d="M48 67 L38 68" stroke="#3a2417" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function TimeIllustration({ slot }: { slot: TimeSlot }) {
  if (slot === "night") return <SleepingCatSVG />;
  if (slot === "morning") return <MorningCatSVG />;
  if (slot === "afternoon") return <AfternoonCatSVG />;
  return <EveningCatSVG />;
}

/* ────────────────────────────────────────────────────────────────── */
/* Item d'historique avec bouton vérifier                             */
/* ────────────────────────────────────────────────────────────────── */

function TopupHistoryItem({ topup, onCredited, currency }: { topup: Topup; onCredited: () => void; currency?: string | null }) {
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ type: "info" | "error"; text: string } | null>(null);

  const handleVerify = async () => {
    if (checking) return;
    setChecking(true);
    setMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setMsg({ type: "error", text: "Session expirée. Reconnectez-vous." });
        return;
      }
      const res = await fetch(`/api/topups/${topup.id}/status?force=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setMsg({ type: "error", text: err.error ?? `Erreur serveur (${res.status}).` });
        return;
      }
      const data = await res.json() as { status: string; _justCredited?: boolean };
      if (data.status === "completed" || data.status === "failed") {
        onCredited();
      } else {
        setMsg({ type: "info", text: "Paiement pas encore confirmé. Réessayez dans 1–2 min." });
      }
    } catch {
      setMsg({ type: "error", text: "Erreur réseau. Réessayez." });
    } finally {
      setChecking(false);
    }
  };

  const date = new Date(topup.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const time = new Date(topup.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });

  const statusCfg = {
    pending:   { label: "En attente", grad: "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: "#FCD34D", text: "#92400E", dot: "#F59E0B", Icon: Clock },
    completed: { label: "Crédité",    grad: "linear-gradient(135deg, #DCFCE7, #BBF7D0)", border: "#86EFAC", text: "#166534", dot: "#16A34A", Icon: CheckCircle2 },
    failed:    { label: "Échoué",     grad: "linear-gradient(135deg, #FEE2E2, #FECACA)", border: "#FCA5A5", text: "#991B1B", dot: "#DC2626", Icon: XCircle },
  };
  const cfg = statusCfg[topup.status as keyof typeof statusCfg] ?? statusCfg.pending;
  const StatusIcon = cfg.Icon;

  const amount = parseFloat(String(topup.amountEur));
  const localAmount = currency && currency !== "EUR" ? formatLocalAmount(amount, currency) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: cfg.grad, border: `1px solid ${cfg.border}` }}
        >
          <StatusIcon className="w-5 h-5" style={{ color: cfg.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-foreground text-base">
              +{amount.toFixed(2)} €
            </span>
            {localAmount && (
              <span className="text-xs font-semibold" style={{ color: BRAND.primaryDark }}>
                ≈ {localAmount}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {date} · {time}
          </div>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: cfg.grad, border: `1px solid ${cfg.border}`, color: cfg.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>
        {topup.status === "pending" && (
          <button
            onClick={handleVerify}
            disabled={checking}
            className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-60 transition-all active:scale-95"
            style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}
            title="Vérifier si ce paiement a été confirmé"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {checking ? "Vérif…" : "Vérifier"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pl-15"
          >
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
              msg.type === "error"
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {msg.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/* Page principale                                                    */
/* ────────────────────────────────────────────────────────────────── */

export default function WalletPage() {
  useMeta({
    title: "Portefeuille — Rechargez votre solde Texerra",
    description: "Rechargez votre solde Texerra avec Orange Money, MTN Mobile Money, Airtel Money, Wave ou carte bancaire. Paiement rapide et sécurisé depuis le Cameroun, Côte d'Ivoire, Sénégal et toute l'Afrique.",
    canonical: "https://texerra.site/wallet",
    noindex: true,
  });

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: me, isLoading: loadingMe } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur chargement profil");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: topups, isLoading: loadingTopups } = useQuery<Topup[]>({
    queryKey: ["/api/topups"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/topups", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur chargement recharges");
      return res.json();
    },
    enabled: !!user,
  });

  const initiateTopupMutation = useMutation({
    mutationFn: async (data: { amountEur: number; name: string; email: string; mobile: string }) => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/topups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Erreur initialisation paiement");
      return res.json() as Promise<{ checkoutUrl: string; topupId: string }>;
    },
  });

  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [pendingTopupId, setPendingTopupId] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");
  const [step, setStep] = useState<"select" | "details" | "pending" | "success" | "failed">("select");
  const [forceChecking, setForceChecking] = useState(false);
  const [forceCheckMsg, setForceCheckMsg] = useState<{ type: "info" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", mobile: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topupParam = params.get("topup");
    const result = params.get("result");
    if (!topupParam) return;

    setPendingTopupId(topupParam);

    if (result === "credited") {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    } else if (result === "failed") {
      setStep("failed");
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    } else {
      setStep("pending");
    }

    const clean = window.location.pathname;
    window.history.replaceState({}, "", clean);
  }, [queryClient]);

  useEffect(() => {
    setForm(f => ({
      name: f.name || me?.name || user?.displayName || "",
      email: f.email || me?.email || user?.email || "",
      mobile: f.mobile || me?.phone || "",
    }));
  }, [me, user]);

  const amount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : null);

  const localCurrency = getCurrency(me?.currency ?? "EUR");
  const showConversion = localCurrency && localCurrency.code !== "EUR" && amount && amount > 0;

  const { data: topupStatus } = useQuery<{ status: string }>({
    queryKey: ["/api/topups", pendingTopupId, "status"],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch(`/api/topups/${pendingTopupId}/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Erreur statut");
      return res.json();
    },
    enabled: !!pendingTopupId && step === "pending",
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;
      if (data.status === "completed" || data.status === "failed") return false;
      return 5000;
    },
  });

  useEffect(() => {
    if (topupStatus?.status === "completed") {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    } else if (topupStatus?.status === "failed") {
      setStep("failed");
      queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
    }
  }, [topupStatus?.status, queryClient]);

  const handleInitiate = () => {
    if (!amount || amount < MIN_AMOUNT || !form.name || !form.email || !form.mobile) return;
    initiateTopupMutation.mutate(
      { amountEur: amount, name: form.name, email: form.email, mobile: form.mobile },
      {
        onSuccess: (data) => {
          if (data.checkoutUrl) {
            setCheckoutUrl(data.checkoutUrl);
            setPendingTopupId(data.topupId);
            setStep("pending");
            window.open(data.checkoutUrl, "_blank");
          }
        },
      }
    );
  };

  const handleForceCheck = useCallback(async () => {
    if (!pendingTopupId || forceChecking) return;
    setForceChecking(true);
    setForceCheckMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setForceCheckMsg({ type: "error", text: "Session expirée. Reconnectez-vous et réessayez." });
        return;
      }
      const res = await fetch(`/api/topups/${pendingTopupId}/status?force=true`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setForceCheckMsg({ type: "error", text: err.error ?? `Erreur serveur (${res.status}). Réessayez.` });
        return;
      }
      const data = await res.json() as { status: string };
      if (data.status === "completed") {
        setStep("success");
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
      } else if (data.status === "failed") {
        setStep("failed");
        queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
      } else {
        setForceCheckMsg({
          type: "info",
          text: "Paiement pas encore confirmé par le partenaire. Attendez 1–2 minutes et réessayez.",
        });
      }
    } catch {
      setForceCheckMsg({ type: "error", text: "Erreur réseau. Vérifiez votre connexion et réessayez." });
    } finally {
      setForceChecking(false);
    }
  }, [pendingTopupId, forceChecking, queryClient]);

  const handleReset = () => {
    setStep("select");
    setPendingTopupId("");
    setCheckoutUrl("");
    setSelectedAmount(null);
    setCustomAmount("");
    setForceCheckMsg(null);
    queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/dashboard";
    }
  };

  const historyTopups = (topups ?? []).filter(t => t.id !== pendingTopupId || step === "select");
  const balanceLocal = me && me.balance !== undefined && me.currency && me.currency !== "EUR"
    ? formatLocalAmount(me.balance, me.currency)
    : null;

  const totalCredited = historyTopups
    .filter(t => t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(String(t.amountEur)), 0);

  const slot = getTimeSlot();

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "linear-gradient(180deg, #FAF7F2 0%, #F2EDE4 100%)" }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Bouton retour */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleBack}
          className="inline-flex items-center gap-2 mb-6 px-4 py-2.5 rounded-2xl bg-white/80 backdrop-blur-sm border border-border/60 text-sm font-semibold text-foreground hover:border-primary/40 hover:shadow-md transition-all active:scale-95 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour
        </motion.button>

        {/* Header avec SVG à droite (opposé du dashboard) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-5 mb-10"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Portefeuille
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1">
              Gérez votre solde et rechargez votre compte en toute sécurité.
            </p>
          </div>
          <TimeIllustration slot={slot} />
        </motion.div>

        {/* Carte solde */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 shadow-sm group"
          style={{
            background: `linear-gradient(135deg, ${BRAND.primarySoft} 0%, #ffffff 60%, #FDF6F1 100%)`,
            border: `1px solid ${BRAND.primary}26`
          }}
        >
          {/* Halo animé */}
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-60 group-hover:opacity-90 transition-opacity"
            style={{ background: `${BRAND.primary}22` }}
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`, color: "#ffffff" }}
                >
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Solde disponible
                </span>
              </div>

              {loadingMe ? (
                <div className="h-14 w-40 bg-secondary animate-pulse rounded-xl" />
              ) : (
                <>
                  <div className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                    {(me?.balance ?? 0).toFixed(2)} <span className="text-2xl sm:text-3xl">€</span>
                  </div>
                  {balanceLocal && (
                    <div className="text-sm font-bold mt-1.5" style={{ color: BRAND.primaryDark }}>
                      ≈ {balanceLocal}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5" style={{ color: BRAND.primary }} />
                <span>Solde permanent — n'expire jamais</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ÉTAPE : sélection du montant ── */}
        {step === "select" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl bg-white border border-border/80 p-6 sm:p-8 mb-8 shadow-sm"
          >
            <div
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryLight})` }}
            />

            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: BRAND.primarySoft, color: BRAND.primary }}
              >
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Recharger votre solde</h2>
                <p className="text-xs text-muted-foreground">Sélectionnez un montant ou saisissez-le manuellement</p>
              </div>
            </div>

            {/* Tiles présélectionnées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {PRESET_AMOUNTS.map((a, idx) => {
                const isSelected = selectedAmount === a;
                const localA = me?.currency && me.currency !== "EUR" ? formatLocalAmount(a, me.currency) : null;
                return (
                  <motion.button
                    key={a}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + idx * 0.04 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedAmount(a); setCustomAmount(""); }}
                    className="relative py-4 rounded-2xl font-bold text-sm transition-all overflow-hidden"
                    style={
                      isSelected
                        ? {
                            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`,
                            color: "#ffffff",
                            boxShadow: `0 8px 24px ${BRAND.primary}44`,
                            border: `1px solid ${BRAND.primaryDark}`
                          }
                        : {
                            background: "#ffffff",
                            border: "1px solid #E7E2D9",
                            color: "#1f2937"
                          }
                    }
                  >
                    {/* Pulse ring sur la sélection */}
                    {isSelected && (
                      <motion.span
                        className="absolute inset-0 rounded-2xl"
                        style={{ border: `2px solid ${BRAND.primaryLight}` }}
                        animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    <div className="relative">
                      <div className="text-xl font-black">{a} €</div>
                      {localA && (
                        <div
                          className="text-[10px] font-semibold mt-0.5"
                          style={{ color: isSelected ? "#ffffffcc" : BRAND.primaryDark }}
                        >
                          ≈ {localA}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Montant personnalisé */}
            <div className="mb-5">
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Autre montant <span className="text-xs opacity-70">(minimum {MIN_AMOUNT.toFixed(2)} €)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={MIN_AMOUNT}
                  step="0.5"
                  placeholder={`Ex: ${MIN_AMOUNT.toFixed(2)}`}
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                  className="w-full px-4 py-3.5 bg-secondary/50 border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                  style={{ borderColor: customAmount ? `${BRAND.primary}66` : undefined }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
              </div>

              {/* Avertissement sous le minimum */}
              {customAmount && parseFloat(customAmount) > 0 && parseFloat(customAmount) < MIN_AMOUNT && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Le montant minimum de recharge est de {MIN_AMOUNT.toFixed(2)} €
                </div>
              )}

              {/* Conversion du montant personnalisé */}
              {localCurrency && localCurrency.code !== "EUR" && customAmount && parseFloat(customAmount) >= MIN_AMOUNT && !selectedAmount && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground mt-1.5"
                >
                  ≈ {formatLocalAmount(parseFloat(customAmount), localCurrency.code)}
                </motion.p>
              )}
            </div>

            {/* Conversion affichée pour un preset sélectionné */}
            {showConversion && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 px-4 py-3 rounded-2xl flex items-center justify-between"
                style={{ background: `${BRAND.primary}0f`, border: `1px solid ${BRAND.primary}26` }}
              >
                <span className="text-xs text-muted-foreground">Équivalent approximatif</span>
                <span className="text-sm font-bold" style={{ color: BRAND.primaryDark }}>
                  ≈ {formatLocalAmount(amount!, localCurrency!.code)}
                </span>
              </motion.div>
            )}

            {(!me?.currency || me.currency === "EUR") && (
              <p className="text-xs text-muted-foreground mb-5 text-center">
                Configurez votre devise dans{" "}
                <a href="/dashboard" className="font-medium hover:underline" style={{ color: BRAND.primary }}>
                  votre profil
                </a>{" "}
                pour voir l'équivalent local.
              </p>
            )}

            <button
              onClick={() => amount && amount >= MIN_AMOUNT && setStep("details")}
              disabled={!amount || amount < MIN_AMOUNT}
              className="relative w-full flex items-center justify-center gap-2 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`,
                boxShadow: amount && amount >= MIN_AMOUNT ? `0 8px 24px ${BRAND.primary}44` : "none"
              }}
            >
              {/* Effet shine */}
              {amount && amount >= MIN_AMOUNT && (
                <motion.span
                  className="absolute inset-0 -translate-x-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  }}
                  animate={{ translateX: ["−100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
              )}
              <span className="relative">
                Continuer {amount ? `— ${amount.toFixed(2)} €` : ""}
              </span>
              <ArrowRight className="w-5 h-5 relative" />
            </button>
          </motion.div>
        )}

        {/* ── ÉTAPE : formulaire ── */}
        {step === "details" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-white border border-border/80 p-6 sm:p-8 mb-8 shadow-sm"
          >
            <div
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryLight})` }}
            />

            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep("select")}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">Vos coordonnées</h2>
                <p className="text-xs text-muted-foreground">Pour la confirmation de votre paiement</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black" style={{ color: BRAND.primaryDark }}>
                  {amount?.toFixed(2)} €
                </div>
                {showConversion && (
                  <div className="text-xs text-muted-foreground">
                    ≈ {formatLocalAmount(amount!, localCurrency!.code)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" required placeholder="Jean Dupont"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3.5 bg-secondary/50 border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email" required placeholder="jean@exemple.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3.5 bg-secondary/50 border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                  Numéro de téléphone
                  {me?.phone && <span className="ml-2 text-xs text-green-600 font-normal">• pré-rempli</span>}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel" required placeholder="+237 6 XX XX XX XX"
                    value={form.mobile}
                    onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3.5 bg-secondary/50 border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleInitiate}
              disabled={!form.name || !form.email || !form.mobile || initiateTopupMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`,
                boxShadow: `0 8px 24px ${BRAND.primary}33`
              }}
            >
              {initiateTopupMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Préparation du paiement…</>
              ) : (
                <>Payer {amount?.toFixed(2)} € <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            {initiateTopupMutation.isError && (
              <p className="text-destructive text-sm mt-3 text-center">Une erreur s'est produite. Réessayez.</p>
            )}
          </motion.div>
        )}

        {/* ── ÉTAPE : paiement en attente ── */}
        {step === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-white border border-border/80 p-6 sm:p-8 text-center mb-8 shadow-sm"
          >
            <div
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryLight})` }}
            />

            {/* Animation d'attente */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: `${BRAND.primary}22` }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-2 rounded-full"
                style={{ background: `${BRAND.primary}33` }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
              <div
                className="absolute inset-4 rounded-full flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}
              >
                <Clock className="w-7 h-7 text-white animate-pulse" />
              </div>
            </div>

            <h2 className="text-xl font-bold mb-2 text-foreground">Paiement en attente</h2>
            <p className="text-muted-foreground mb-2 text-sm leading-relaxed max-w-md mx-auto">
              Complétez le paiement dans la fenêtre ouverte, puis revenez ici.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              La vérification est automatique. Si vous avez déjà payé, cliquez sur le bouton ci-dessous.
            </p>

            {topupStatus && topupStatus.status !== "pending" && (
              <div className="bg-secondary border border-border rounded-2xl px-4 py-3 text-sm font-medium mb-6">
                Statut : <span className={topupStatus.status === "completed" ? "text-green-600" : "text-primary capitalize"}>{topupStatus.status}</span>
              </div>
            )}

            <AnimatePresence>
              {forceCheckMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium flex items-start gap-2 text-left ${
                    forceCheckMsg.type === "error"
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : "bg-blue-50 border border-blue-200 text-blue-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {forceCheckMsg.text}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleForceCheck}
              disabled={forceChecking}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-2xl transition-all disabled:opacity-60 text-sm mb-3 active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`,
                boxShadow: `0 6px 20px ${BRAND.primary}33`
              }}
            >
              {forceChecking ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Vérification en cours…</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> J'ai payé — vérifier maintenant</>
              )}
            </button>

            <div className="flex gap-3 flex-col sm:flex-row">
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 flex-1 py-3 bg-secondary border border-border rounded-2xl text-sm font-semibold hover:border-primary/40 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Rouvrir le paiement
                </a>
              )}
              <button
                onClick={handleReset}
                className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border rounded-2xl hover:bg-secondary/50 transition-colors"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE : succès ── */}
        {step === "success" && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden rounded-3xl bg-white border border-green-200 p-8 text-center mb-8 shadow-sm"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-green-400 to-emerald-500" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 shadow-md"
            >
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </motion.div>
            <h2 className="text-xl font-bold mb-3 text-foreground">Solde rechargé !</h2>
            <p className="text-muted-foreground mb-6 text-sm">Votre solde a été crédité avec succès.</p>
            <div className="text-4xl font-black mb-1" style={{ color: BRAND.primaryDark }}>
              {(me?.balance ?? 0).toFixed(2)} €
            </div>
            {balanceLocal && (
              <div className="text-sm font-semibold text-muted-foreground mb-8">≈ {balanceLocal}</div>
            )}
            <div className="flex gap-3 flex-col sm:flex-row justify-center">
              <a
                href="/order"
                className="flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-2xl transition-all active:scale-95 text-sm"
                style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}
              >
                Commander un numéro <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-border rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                Recharger encore
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE : échec ── */}
        {step === "failed" && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative overflow-hidden rounded-3xl bg-white border border-red-200 p-8 text-center mb-8 shadow-sm"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-400 to-rose-500" />
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-3 text-foreground">Paiement non abouti</h2>
            <p className="text-muted-foreground mb-6 text-sm">Le paiement n'a pas pu être confirmé. Votre solde n'a pas été modifié.</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 text-white font-semibold rounded-2xl transition-all active:scale-95 text-sm"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})` }}
            >
              Réessayer
            </button>
          </motion.div>
        )}

        {/* ── Historique redesigné ── */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-3xl bg-white border border-border/80 shadow-sm"
          >
            <div
              className="absolute top-0 left-0 h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.primaryLight})` }}
            />

            {/* En-tête avec résumé */}
            <div className="p-6 border-b border-border/60 bg-gradient-to-br from-white to-secondary/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark})`, color: "#ffffff" }}
                  >
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Historique des recharges</h2>
                    <p className="text-xs text-muted-foreground">Toutes vos transactions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total crédité</div>
                    <div className="text-lg font-black text-foreground">{totalCredited.toFixed(2)} €</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loadingTopups ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                    </div>
                  ))}
                </div>
              ) : historyTopups.length === 0 ? (
                <div className="text-center py-10">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner"
                    style={{ background: BRAND.primarySoft }}
                  >
                    <Wallet className="w-7 h-7" style={{ color: BRAND.primary }} />
                  </div>
                  <p className="text-sm text-muted-foreground">Aucune recharge pour l'instant.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyTopups.map((topup, i) => (
                    <motion.div
                      key={topup.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-2xl border border-border/60 p-4 hover:shadow-md transition-all"
                      style={{ background: "#ffffff" }}
                    >
                      <TopupHistoryItem
                        topup={topup}
                        currency={me?.currency}
                        onCredited={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/topups"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {historyTopups.some(t => t.status === "pending") && (
                <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground bg-amber-50/60 border border-amber-200/60 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Les recharges <span className="font-semibold text-amber-700">En attente</span> peuvent être vérifiées manuellement.
                    Le bouton disparaît dès que le paiement est confirmé et le solde crédité.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}