package com.mcode.desktop;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * Hosts the mcode WebView.
 *
 * Two things happen here that a plain Capacitor shell does not do:
 *
 *  1. The WebView opens straight on the login screen. Capacitor would load the
 *     bare `server.url`, which is the marketing homepage — but a WebView has no
 *     address bar and no history of its own, so there is no reason to make a
 *     user pass through the marketing site to reach the app.
 *
 *  2. The route guard is re-injected after every document load. Capacitor has
 *     no notion of which routes an app allows, and Next.js moves between
 *     screens with history.pushState — which Android's WebViewClient does not
 *     treat as a navigation — so the restriction has to live inside the page.
 *     The script is generated from routes.mjs by `npm run guard` and copied
 *     into assets by `npm run sync`.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "mcode";

    /** Mirrors INITIAL_PATH in the Windows shell (packages/desktop). */
    private static final String START_PATH = "/login";

    private static final String GUARD_ASSET = "android-guard.js";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        registerRouteGuard();
        openStartScreen();
    }

    /**
     * Re-installs the guard after each load.
     *
     * Every full navigation replaces the document, taking the patched history
     * methods with it. Client-side routing inside Next.js keeps the same
     * document, so one install covers all in-app navigation.
     */
    private void registerRouteGuard() {
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }
        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                injectGuard(webView);
            }
        });
    }

    private void injectGuard(WebView webView) {
        try (java.io.InputStream in = getAssets().open(GUARD_ASSET)) {
            String script = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            webView.evaluateJavascript(script, null);
        } catch (Exception e) {
            // Never crash the app over a missing guard — the worst case is that
            // navigation is unrestricted, which is the pre-guard behaviour.
            Log.w(TAG, "route guard not injected: " + e.getMessage());
        }
    }

    private void openStartScreen() {
        String base = getServerUrl();
        if (base == null || base.isEmpty()) {
            Log.w(TAG, "no server.url configured — falling back to bundled assets");
            return;
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            return;
        }

        final String url = joinUrl(base, START_PATH);
        // Posted so it runs after Capacitor has finished its own initial load.
        webView.post(new Runnable() {
            @Override
            public void run() {
                webView.loadUrl(url);
            }
        });
    }

    private String getServerUrl() {
        try {
            return getConfig().getServerUrl();
        } catch (Exception e) {
            return null;
        }
    }

    private static String joinUrl(String base, String path) {
        if (base.endsWith("/")) {
            return base.substring(0, base.length() - 1) + path;
        }
        return base + path;
    }
}
