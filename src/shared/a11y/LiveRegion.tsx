import { useEffect, useRef } from "react";
import { _registerLiveRegion } from "@/shared/a11y/announcer";

/**
 * Hai node aria-live luôn nằm trong DOM (mount một lần trong providers).
 * Node phải tồn tại TRƯỚC khi có thông báo — screen reader bỏ qua
 * live region vừa được chèn cùng lúc với nội dung.
 */
export function LiveRegion() {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    _registerLiveRegion("polite", politeRef.current);
    _registerLiveRegion("assertive", assertiveRef.current);
    return () => {
      _registerLiveRegion("polite", null);
      _registerLiveRegion("assertive", null);
    };
  }, []);

  return (
    <>
      <div ref={politeRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <div ref={assertiveRef} aria-live="assertive" aria-atomic="true" className="sr-only" />
    </>
  );
}
