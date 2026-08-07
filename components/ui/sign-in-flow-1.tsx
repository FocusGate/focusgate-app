"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/supabase";
import { FocusGateMark } from "@/components/landing/Navbar";

type Uniforms = {
  [key: string]: {
    value: number[] | number[][] | number;
    type: string;
  };
};

interface ShaderProps {
  source: string;
  uniforms: Uniforms;
  maxFps?: number;
}

export interface SignInPageProps {
  className?: string;
  /** "signup" collects a display name and creates the account; "login" refuses unknown emails. */
  mode?: "login" | "signup";
}

/** FocusGate gold, matching --fg-gold-bright / --fg-gold in globals.css. */
const GOLD_DOTS = [
  [245, 158, 11],
  [176, 141, 87],
];

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
  reverse = false,
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
  reverse?: boolean;
}) => {
  return (
    <div className={cn("h-full relative w-full", containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors ?? [[0, 255, 255]]}
          dotSize={dotSize ?? 3}
          opacities={opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
          shader={`
            ${reverse ? "u_reverse_active" : "false"}_;
            animation_speed_factor_${animationSpeed.toFixed(1)}_;
          `}
          center={["x", "y"]}
        />
      </div>
      {showGradient && <div className="absolute inset-0 bg-gradient-to-t from-[#060606] to-transparent" />}
    </div>
  );
};

interface DotMatrixProps {
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  shader?: string;
  center?: ("x" | "y")[];
}

const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  shader = "",
  center = ["x", "y"],
}) => {
  const uniforms = React.useMemo(() => {
    let colorsArray = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
    if (colors.length === 2) {
      colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
    } else if (colors.length === 3) {
      colorsArray = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
    }
    return {
      u_colors: {
        value: colorsArray.map((color) => [color[0] / 255, color[1] / 255, color[2] / 255]),
        type: "uniform3fv",
      },
      u_opacities: { value: opacities, type: "uniform1fv" },
      u_total_size: { value: totalSize, type: "uniform1f" },
      u_dot_size: { value: dotSize, type: "uniform1f" },
      u_reverse: {
        value: shader.includes("u_reverse_active") ? 1 : 0,
        type: "uniform1i",
      },
    };
  }, [colors, opacities, totalSize, dotSize, shader]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform int u_reverse;

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        float map(float value, float min1, float max1, float min2, float max2) {
            return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
        }

        void main() {
            vec2 st = fragCoord.xy;
            ${
              center.includes("x")
                ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }
            ${
              center.includes("y")
                ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));"
                : ""
            }

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[int(show_offset * 6.0)];

            float animation_speed_factor = 0.5;
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);

            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

            float current_timing_offset;
            if (u_reverse == 1) {
                current_timing_offset = timing_offset_outro;
                opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            } else {
                current_timing_offset = timing_offset_intro;
                opacity *= step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            }

            fragColor = vec4(color, opacity);
            fragColor.rgb *= fragColor.a;
        }`}
      uniforms={uniforms}
      maxFps={60}
    />
  );
};

const ShaderMaterial = ({ source, uniforms, maxFps = 60 }: ShaderProps) => {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh>(null);
  // Honours the maxFps prop (the upstream component accepted it but never throttled).
  const lastFrameTime = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const timestamp = clock.getElapsedTime();
    if (timestamp - lastFrameTime.current < 1 / maxFps) return;
    lastFrameTime.current = timestamp;

    const material = ref.current.material as THREE.ShaderMaterial;
    material.uniforms.u_time.value = timestamp;
  });

  const material = useMemo(() => {
    const preparedUniforms: Record<string, THREE.IUniform> = {};

    for (const uniformName in uniforms) {
      const uniform = uniforms[uniformName];

      switch (uniform.type) {
        case "uniform1f":
          preparedUniforms[uniformName] = { value: uniform.value };
          break;
        case "uniform1i":
          preparedUniforms[uniformName] = { value: uniform.value };
          break;
        case "uniform3f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector3().fromArray(uniform.value as number[]),
          };
          break;
        case "uniform1fv":
          preparedUniforms[uniformName] = { value: uniform.value };
          break;
        case "uniform3fv":
          preparedUniforms[uniformName] = {
            value: (uniform.value as number[][]).map((v) => new THREE.Vector3().fromArray(v)),
          };
          break;
        case "uniform2f":
          preparedUniforms[uniformName] = {
            value: new THREE.Vector2().fromArray(uniform.value as number[]),
          };
          break;
        default:
          console.error(`Invalid uniform type for '${uniformName}'.`);
          break;
      }
    }

    preparedUniforms["u_time"] = { value: 0 };
    preparedUniforms["u_resolution"] = {
      value: new THREE.Vector2(size.width * 2, size.height * 2),
    };

    return new THREE.ShaderMaterial({
      vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }
      `,
      fragmentShader: source,
      uniforms: preparedUniforms,
      glslVersion: THREE.GLSL3,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, source]);

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

const Shader: React.FC<ShaderProps> = ({ source, uniforms, maxFps = 60 }) => {
  return (
    <Canvas className="absolute inset-0 h-full w-full">
      <ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} />
    </Canvas>
  );
};

/**
 * Each span is pinned to the container's own height so the stack sits flush at the
 * top — the upstream version combined `items-center` with `overflow-hidden`, which
 * centred the double-height stack and clipped it mid-way, showing both labels at once.
 */
const AnimatedNavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="group relative block overflow-hidden h-5 text-xs tracking-[0.14em] uppercase">
    <div className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
      <span className="h-5 flex items-center text-[#b79a6f]">{children}</span>
      <span className="h-5 flex items-center text-[#F59E0B]">{children}</span>
    </div>
  </Link>
);

function FocusGateAuthNav({ mode }: { mode: "login" | "signup" }) {
  const [isOpen, setIsOpen] = useState(false);
  // Open shape is derived directly from `isOpen` (instant). Only the *closing* shape needs
  // a timer, so it can outlast the closing animation before rounding back to a pill — that's
  // the only piece that legitimately belongs in an effect, avoiding a synchronous setState
  // on every open (flagged by react-hooks/set-state-in-effect).
  const [closedShapeClass, setClosedShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerShapeClass = isOpen ? "rounded-xl" : closedShapeClass;

  useEffect(() => {
    if (isOpen) return;
    shapeTimeoutRef.current = setTimeout(() => setClosedShapeClass("rounded-full"), 300);
    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
    };
  }, [isOpen]);

  const navLinksData = [
    { label: "Features", href: "/#features" },
    { label: "Badges", href: "/#badges" },
    { label: "Pricing", href: "/#pricing" },
  ];

  const swapHref = mode === "login" ? "/signup" : "/login";
  const swapLabel = mode === "login" ? "Create account" : "Sign in";

  const swapButton = (
    <div className="relative group w-full sm:w-auto">
      <div
        className="absolute inset-0 -m-2 rounded-full hidden sm:block bg-[#F59E0B] opacity-25 filter blur-lg
                   pointer-events-none transition-all duration-300 ease-out group-hover:opacity-40 group-hover:blur-xl group-hover:-m-3"
      />
      <Link
        href={swapHref}
        className="relative z-10 block text-center px-4 py-2 sm:px-3 text-xs sm:text-sm font-semibold text-black
                   bg-gradient-to-br from-[#F59E0B] to-[#b08d57] rounded-full transition-all duration-200 w-full sm:w-auto"
      >
        {swapLabel}
      </Link>
    </div>
  );

  return (
    <header
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center
                  pl-6 pr-6 py-3 backdrop-blur-sm ${headerShapeClass}
                  border border-[#26262b] bg-[#0a0a0a99]
                  w-[calc(100%-2rem)] sm:w-auto transition-[border-radius] duration-0 ease-in-out`}
    >
      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        <Link href="/" className="flex items-center gap-2.5">
          <FocusGateMark size={22} />
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#b08d57" }}>FocusGate</span>
        </Link>

        <nav className="hidden sm:flex items-center space-x-6">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.href} href={link.href}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-3">{swapButton}</div>

        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 text-[#b08d57] focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
      </div>

      <div
        className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden
                    ${isOpen ? "max-h-[1000px] opacity-100 pt-4" : "max-h-0 opacity-0 pt-0 pointer-events-none"}`}
      >
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <Link key={link.href} href={link.href} className="text-[#b79a6f] hover:text-[#F59E0B] transition-colors w-full text-center">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">{swapButton}</div>
      </div>
    </header>
  );
}

export const SignInPage = ({ className, mode = "login" }: SignInPageProps) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true);
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || busy) return;
    setError(null);
    setBusy(true);
    try {
      await sendEmailOtp(email, isSignup);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step === "code") {
      const id = setTimeout(() => codeInputRefs.current[0]?.focus(), 500);
      return () => clearTimeout(id);
    }
  }, [step]);

  async function submitCode(token: string) {
    setError(null);
    setBusy(true);
    try {
      await verifyEmailOtp(email, token, isSignup ? name : undefined);
      // Only play the reveal-out ceremony once the code actually verified.
      setReverseCanvasVisible(true);
      setTimeout(() => setInitialCanvasVisible(false), 50);
      setTimeout(() => setStep("success"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not work. Try again.");
      setCode(["", "", "", "", "", ""]);
      codeInputRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) codeInputRefs.current[index + 1]?.focus();
    // Checked across the whole array so pasting or filling out of order still submits.
    if (newCode.every((d) => d.length === 1)) void submitCode(newCode.join(""));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  }

  async function handleResend() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await sendEmailOtp(email, isSignup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  }

  function handleBackClick() {
    setStep("email");
    setCode(["", "", "", "", "", ""]);
    setError(null);
    setReverseCanvasVisible(false);
    setInitialCanvasVisible(true);
  }

  const headingFont = { fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif" };

  return (
    <div className={cn("flex w-full flex-col min-h-screen bg-[#060606] relative", className)}>
      <div className="absolute inset-0 z-0">
        {initialCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect
              animationSpeed={3}
              containerClassName="bg-[#060606]"
              colors={GOLD_DOTS}
              dotSize={6}
              reverse={false}
            />
          </div>
        )}

        {reverseCanvasVisible && (
          <div className="absolute inset-0">
            <CanvasRevealEffect
              animationSpeed={4}
              containerClassName="bg-[#060606]"
              colors={GOLD_DOTS}
              dotSize={6}
              reverse={true}
            />
          </div>
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,6,6,0.92)_0%,_transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-[#060606] to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <FocusGateAuthNav mode={mode} />

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full mt-[150px] max-w-sm px-6">
              <AnimatePresence mode="wait">
                {step === "email" ? (
                  <motion.div
                    key="email-step"
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-2">
                      <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white" style={headingFont}>
                        {isSignup ? "Start locking in." : "Welcome back."}
                      </h1>
                      <p className="text-[1.1rem] text-[#9a9da4] font-light">
                        {isSignup ? "Free during beta. No card, no catch." : "Your streak is waiting."}
                      </p>
                    </div>

                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      {isSignup && (
                        <input
                          type="text"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full backdrop-blur-[1px] text-white border border-white/10 rounded-full py-3 px-4
                                     focus:outline-none focus:border-[#F59E0B]/50 text-center bg-transparent transition-colors"
                        />
                      )}
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="you@university.edu"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full backdrop-blur-[1px] text-white border border-white/10 rounded-full py-3 pl-4 pr-12
                                     focus:outline-none focus:border-[#F59E0B]/50 text-center bg-transparent transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          aria-label="Send my code"
                          className="absolute right-1.5 top-1.5 text-black w-9 h-9 flex items-center justify-center rounded-full
                                     bg-[#F59E0B] hover:bg-[#fbbf24] disabled:opacity-50 transition-colors group overflow-hidden"
                        >
                          <span className="relative w-full h-full block overflow-hidden">
                            <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full">
                              →
                            </span>
                            <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 -translate-x-full group-hover:translate-x-0">
                              →
                            </span>
                          </span>
                        </button>
                      </div>
                    </form>

                    {error && <p className="text-[#f87171] text-sm">{error}</p>}
                    {busy && !error && <p className="text-[#9a9da4] text-sm">Sending your code…</p>}

                    <p className="text-xs text-white/40 pt-8">
                      We email you a 6-digit code — no password to forget.{" "}
                      <Link href={`${mode === "signup" ? "/signup" : "/login"}/password`} className="underline hover:text-white/60 transition-colors">
                        Use a password instead
                      </Link>
                    </p>
                  </motion.div>
                ) : step === "code" ? (
                  <motion.div
                    key="code-step"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-2">
                      <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white" style={headingFont}>
                        Check your inbox.
                      </h1>
                      <p className="text-[1.1rem] text-[#9a9da4] font-light">
                        We sent a 6-digit code to {email}
                      </p>
                    </div>

                    <div className="w-full">
                      <div className="relative rounded-full py-4 px-5 border border-white/10 bg-transparent">
                        <div className="flex items-center justify-center">
                          {code.map((digit, i) => (
                            <div key={i} className="flex items-center">
                              <div className="relative">
                                <input
                                  ref={(el) => {
                                    codeInputRefs.current[i] = el;
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleCodeChange(i, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(i, e)}
                                  className="w-8 text-center text-xl bg-transparent text-white border-none focus:outline-none focus:ring-0 appearance-none"
                                  style={{ caretColor: "transparent" }}
                                />
                                {!digit && (
                                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                                    <span className="text-xl text-white/25">0</span>
                                  </div>
                                )}
                              </div>
                              {i < 5 && <span className="text-white/20 text-xl">|</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {error && <p className="text-[#f87171] text-sm">{error}</p>}

                    <motion.p
                      onClick={handleResend}
                      className="text-[#9a9da4] hover:text-[#F59E0B] transition-colors cursor-pointer text-sm"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      {busy ? "Working…" : "Resend code"}
                    </motion.p>

                    <div className="flex w-full gap-3">
                      <motion.button
                        onClick={handleBackClick}
                        className="rounded-full border border-white/15 text-white font-medium px-8 py-3 hover:border-white/40 transition-colors w-[34%]"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        Back
                      </motion.button>
                      <motion.button
                        onClick={() => void submitCode(code.join(""))}
                        className={`flex-1 rounded-full font-medium py-3 border transition-all duration-300 ${
                          code.every((d) => d !== "")
                            ? "bg-[#F59E0B] text-black border-transparent hover:bg-[#fbbf24] cursor-pointer"
                            : "bg-[#111] text-white/40 border-white/10 cursor-not-allowed"
                        }`}
                        disabled={!code.every((d) => d !== "") || busy}
                      >
                        Unlock
                      </motion.button>
                    </div>

                    <div className="pt-12">
                      <p className="text-xs text-white/40">
                        Wrong address?{" "}
                        <button onClick={handleBackClick} className="underline hover:text-white/60 transition-colors">
                          Use a different email
                        </button>
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success-step"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-2">
                      <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white" style={headingFont}>
                        You&apos;re locked in.
                      </h1>
                      <p className="text-[1.1rem] text-[#9a9da4] font-light">No exit. No excuses.</p>
                    </div>

                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.5 }}
                      className="py-10"
                    >
                      <div
                        className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#b08d57] flex items-center justify-center"
                        style={{ boxShadow: "0 0 40px rgba(245,158,11,0.45)" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </motion.div>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      onClick={() => router.push("/dashboard")}
                      className="w-full rounded-full bg-[#F59E0B] text-black font-semibold py-3 hover:bg-[#fbbf24] transition-colors"
                    >
                      Start a session →
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
