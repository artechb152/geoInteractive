/** Latin, digits and symbols inside Hebrew text: without an LTR isolate the
    bidi algorithm reorders "H = h − N" or "(∆x, ∆y, ∆z)" in an RTL line. */
export function L({ children }: { children: React.ReactNode }) {
  return (
    <bdi dir="ltr" className="whitespace-nowrap">
      {children}
    </bdi>
  );
}
