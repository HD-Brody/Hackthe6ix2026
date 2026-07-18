import { auth0 } from "@/lib/auth0";

export default async function TestAuthPage() {
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top left, #0d0e15, #161824)",
      color: "#c0caf5",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "40px 20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        maxWidth: "640px",
        width: "100%",
        backgroundColor: "rgba(30, 32, 48, 0.75)",
        backdropFilter: "blur(16px)",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "36px",
        boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)"
      }}>
        <h1 style={{
          fontSize: "26px",
          fontWeight: 800,
          color: "#7aa2f7",
          marginTop: 0,
          marginBottom: "6px",
          letterSpacing: "-0.5px"
        }}>
          Auth0 Authentication Test
        </h1>
        <p style={{
          color: "#9ece6a",
          fontSize: "14px",
          marginBottom: "28px"
        }}>
          Verify Next.js Middleware routing, session cookies, and user retrieval
        </p>

        {/* Auth status block */}
        <div style={{
          backgroundColor: user ? "rgba(158, 206, 106, 0.08)" : "rgba(247, 118, 142, 0.08)",
          border: `1px solid ${user ? "rgba(158, 206, 106, 0.2)" : "rgba(247, 118, 142, 0.2)"}`,
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "12px", color: "#565f89", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "4px" }}>
              Authentication State
            </span>
            <span style={{ fontSize: "18px", fontWeight: 700, color: user ? "#9ece6a" : "#f7768e" }}>
              {user ? "Authenticated / Logged In" : "Unauthenticated / Logged Out"}
            </span>
          </div>
          <div style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: user ? "#9ece6a" : "#f7768e",
            boxShadow: `0 0 10px ${user ? "#9ece6a" : "#f7768e"}`
          }} />
        </div>

        {user ? (
          <div>
            {/* Profile Detail Card */}
            <div style={{
              backgroundColor: "#16161e",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid rgba(255, 255, 255, 0.04)",
              marginBottom: "24px",
              display: "flex",
              gap: "20px",
              alignItems: "center"
            }}>
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name || "User Avatar"}
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    border: "2px solid #7aa2f7"
                  }}
                />
              ) : (
                <div style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  backgroundColor: "#24283b",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: "24px",
                  color: "#7aa2f7",
                  border: "2px solid #7aa2f7"
                }}>
                  👤
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#7aa2f7" }}>
                  {user.name}
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#565f89" }}>
                  Email: <span style={{ color: "#c0caf5" }}>{user.email}</span>
                </p>
                {user.nickname && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#565f89" }}>
                    Nickname: <span style={{ color: "#c0caf5" }}>{user.nickname}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Raw Session Token Viewer */}
            <div style={{ marginBottom: "28px" }}>
              <span style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#565f89", textTransform: "uppercase", marginBottom: "8px" }}>
                Raw Session Metadata
              </span>
              <pre style={{
                margin: 0,
                backgroundColor: "#16161e",
                borderRadius: "8px",
                padding: "16px",
                border: "1px solid rgba(255, 255, 255, 0.03)",
                fontSize: "13px",
                fontFamily: "monospace",
                color: "#9ece6a",
                overflowX: "auto",
                maxHeight: "150px"
              }}>
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            <a
              href="/auth/logout"
              style={{
                display: "block",
                textAlign: "center",
                backgroundColor: "rgba(247, 118, 142, 0.15)",
                color: "#f7768e",
                fontWeight: 600,
                fontSize: "15px",
                padding: "14px 28px",
                border: "1px solid rgba(247, 118, 142, 0.3)",
                borderRadius: "8px",
                cursor: "pointer",
                textDecoration: "none",
                transition: "background-color 0.2s"
              }}
            >
              Log Out of Application
            </a>
          </div>
        ) : (
          <div>
            <p style={{
              fontSize: "15px",
              lineHeight: "1.6",
              color: "#a9b1d6",
              marginBottom: "32px",
              textAlign: "center"
            }}>
              No active session found. Visit the route below to initiate Auth0 login redirection.
              Upon successful login, you will be redirected back here.
            </p>

            <a
              href="/auth/login"
              style={{
                display: "block",
                textAlign: "center",
                backgroundColor: "#7aa2f7",
                color: "#1a1b26",
                fontWeight: 700,
                fontSize: "15px",
                padding: "14px 28px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(122, 162, 247, 0.25)"
              }}
            >
              Log In with Auth0
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
