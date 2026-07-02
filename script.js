(function () {
  "use strict";

  const CONFIG = {
    chainId: 4663,
    chainIdHex: "0x1237",
    chainName: "Robinhood Chain",
    chainSlug: "robinhood",
    nativeSymbol: "ETH",
    launchpadUrl: "https://app.uniswap.org/swap?outputCurrency=0xcomingsoon&chain=robinhood",
    explorerUrl: "https://robinhoodchain.blockscout.com",
    noxaApiUrl: "https://awk00kk00gskkw0o8kc488kg.notoriouslywrong.com",
    launchLocker: "0x7F03effbd7ceB22A3f80Dd468f67eF27826acD85",
    rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    tokenAddress: "",
    tokenName: "RobinHodl",
    tokenSymbol: "ROBINHODL",
    bondingTargetEth: 4.2,
    totalSupply: 1_000_000_000,
    copyFeedbackMs: 2000,
    pollIntervalMs: 30_000,
  };

  const COPY_FEEDBACK_MS = CONFIG.copyFeedbackMs;

  const copyBtn = document.getElementById("copy-ca-btn");
  const copyFeedback = document.getElementById("copy-feedback");
  const contractEl = document.getElementById("contract-address");
  const buyLinks = document.querySelectorAll("[data-buy-link]");
  const chartLinks = document.querySelectorAll("[data-chart-link]");
  const statsBadge = document.getElementById("stats-badge");
  const graduationFill = document.getElementById("graduation-fill");
  const graduationLabel = document.getElementById("graduation-label");

  let activeToken = null;

  function formatEth(value, digits = 4) {
    if (value == null || Number.isNaN(value)) return "—";
    if (value >= 1000)
      return `${value.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      })} ETH`;
    if (value >= 1) return `${value.toFixed(3)} ETH`;
    if (value >= 0.0001) return `${value.toFixed(6)} ETH`;
    return `${value.toExponential(2)} ETH`;
  }

  function formatPriceEth(value) {
    if (value == null || Number.isNaN(value)) return "—";
    if (value >= 0.0001) return `${value.toFixed(8)} ETH`;
    return `${value.toExponential(3)} ETH`;
  }

  function shortenAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  function tokenTradeUrl(address) {
    return `${CONFIG.launchpadUrl}/token/${address}`;
  }

  function explorerAddressUrl(address) {
    return `${CONFIG.explorerUrl}/address/${address}`;
  }

  function setContractAddress(address) {
    if (!address) return;
    if (contractEl) contractEl.textContent = address;
    buyLinks.forEach((link) => {
      link.href = tokenTradeUrl(address);
    });
    chartLinks.forEach((link) => {
      link.href = tokenTradeUrl(address);
    });
  }

  async function fetchJson(path) {
    const response = await fetch(`${CONFIG.noxaApiUrl}${path}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }

  async function fetchTokenByAddress(address) {
    const data = await fetchJson(`/v1/${CONFIG.chainSlug}/token/${address}`);
    const token = data.token ?? data;
    const stats = data.stats ?? {};
    return {
      ...token,
      priceEth: stats.lastPriceEth ?? token.priceEth,
      marketCapEth: token.marketCapEth,
      volume24hEth: stats.volume24hEth ?? token.volume24hEth,
      priceChange6hPct: stats.priceChange6hPct ?? token.priceChange6hPct,
      netBuyAmountEth: token.netBuyAmountEth,
    };
  }

  async function resolveToken() {
    if (CONFIG.tokenAddress) {
      return fetchTokenByAddress(CONFIG.tokenAddress);
    }

    const search = await fetchJson(
      `/v1/${CONFIG.chainSlug}/tokens/search?q=${encodeURIComponent(
        CONFIG.tokenName
      )}`
    );
    const exact = (search.tokens ?? []).find(
      (token) =>
        token.symbol?.toUpperCase() === CONFIG.tokenSymbol &&
        token.name?.toLowerCase() === CONFIG.tokenName.toLowerCase()
    );
    if (exact?.address) return fetchTokenByAddress(exact.address);

    const symbolSearch = await fetchJson(
      `/v1/${CONFIG.chainSlug}/tokens/search?q=${encodeURIComponent(
        CONFIG.tokenSymbol
      )}`
    );
    const byName = (symbolSearch.tokens ?? []).find(
      (token) => token.name?.toLowerCase() === CONFIG.tokenName.toLowerCase()
    );
    return byName?.address ? fetchTokenByAddress(byName.address) : null;
  }

  function renderStats(token) {
    activeToken = token;

    if (statsBadge) {
      statsBadge.textContent = "[ LIVE · NOXA FUN ]";
      statsBadge.classList.remove("text-neon/40");
      statsBadge.classList.add("text-neon/70");
    }

    setContractAddress(token.address);

    const mcapEl = document.querySelector('[data-stat="mcap"]');
    const priceEl = document.querySelector('[data-stat="price"]');
    const volumeEl = document.querySelector('[data-stat="volume"]');
    const holdersEl = document.querySelector('[data-stat="holders"]');
    const liqEl = document.querySelector('[data-stat="liquidity"]');
    const mcapDeltaEl = document.querySelector('[data-stat="mcap-delta"]');
    const priceDeltaEl = document.querySelector('[data-stat="price-delta"]');

    if (mcapEl) mcapEl.textContent = formatEth(token.marketCapEth);
    if (priceEl) priceEl.textContent = formatPriceEth(token.priceEth);
    if (volumeEl) volumeEl.textContent = formatEth(token.volume24hEth ?? 0);

    if (holdersEl && token.holderCount != null) {
      holdersEl.textContent = Number(token.holderCount).toLocaleString("en-US");
    }

    if (liqEl) {
      liqEl.textContent = "Locked Forever";
    }

    const liqNote = document.querySelector('[data-stat="liquidity-note"]');
    if (liqNote) {
      liqNote.textContent = `🔒 NOXA Launch Locker · Uniswap V3 1%`;
    }

    const pct = token.priceChange6hPct;
    if (mcapDeltaEl && pct != null) {
      const sign = pct >= 0 ? "▲" : "▼";
      mcapDeltaEl.textContent = `${sign} ${Math.abs(pct).toFixed(1)}% 6h`;
      mcapDeltaEl.className = `text-xs mt-2 ${
        pct >= 0 ? "text-green-400" : "text-red-400"
      }`;
    }
    if (priceDeltaEl && pct != null) {
      const sign = pct >= 0 ? "▲" : "▼";
      priceDeltaEl.textContent = `${sign} ${Math.abs(pct).toFixed(1)}% 6h`;
      priceDeltaEl.className = `text-xs mt-2 ${
        pct >= 0 ? "text-green-400" : "text-red-400"
      }`;
    }

    const netBuy = Number(token.netBuyAmountEth ?? 0);
    const target = CONFIG.bondingTargetEth;
    const progress = Math.min(100, (netBuy / target) * 100);

    if (graduationFill) graduationFill.style.width = `${progress}%`;
    if (graduationLabel) {
      graduationLabel.textContent = `${netBuy.toFixed(
        3
      )} / ${target} ETH net buy`;
    }

    const gradStatus = document.getElementById("graduation-status");
    if (gradStatus) {
      gradStatus.textContent =
        progress >= 100
          ? "🎓 Graduated on Robinhood Chain"
          : `🎯 Graduation milestone · ${progress.toFixed(1)}%`;
    }
  }

  function renderPendingLaunch() {
    if (statsBadge) {
      statsBadge.textContent = "[ AWAITING LAUNCH ON NOXA ]";
    }

    const pendingCa = "Deploy on NOXA Fun → fun.noxa.fi/robinhood";
    if (contractEl) contractEl.textContent = pendingCa;

    buyLinks.forEach((link) => {
      link.href = CONFIG.launchpadUrl;
    });
    chartLinks.forEach((link) => {
      link.href = CONFIG.launchpadUrl;
    });

    document
      .querySelectorAll(
        '[data-stat="mcap"], [data-stat="price"], [data-stat="volume"]'
      )
      .forEach((el) => {
        el.textContent = "—";
      });

    if (graduationLabel) {
      graduationLabel.textContent = `Target: ${CONFIG.bondingTargetEth} ETH net buy`;
    }
  }

  async function refreshLiveStats() {
    try {
      const token = await resolveToken();
      if (!token?.address) {
        renderPendingLaunch();
        return;
      }

      renderStats(token);

      try {
        const holdersData = await fetchJson(
          `/v1/${CONFIG.chainSlug}/token/${token.address}/holders?limit=1`
        );
        const holdersEl = document.querySelector('[data-stat="holders"]');
        const totalHolders = holdersData.pagination?.total ?? holdersData.total;
        if (holdersEl && totalHolders != null) {
          holdersEl.textContent = Number(totalHolders).toLocaleString("en-US");
        }
      } catch {
        /* holders endpoint optional */
      }
    } catch (error) {
      console.warn("RobinHodl stats refresh failed:", error);
      if (!activeToken) renderPendingLaunch();
    }
  }

  async function copyContractAddress() {
    const text = activeToken?.address || contractEl?.textContent?.trim() || "";

    if (!text || text.includes("Deploy on NOXA")) {
      window.open(CONFIG.launchpadUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showCopiedState();
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) showCopiedState();
    }
  }

  function showCopiedState() {
    if (!copyBtn || !copyFeedback) return;

    copyBtn.classList.add("copied");
    copyFeedback.classList.remove("hidden");
    copyFeedback.classList.add("flex");

    window.setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyFeedback.classList.add("hidden");
      copyFeedback.classList.remove("flex");
    }, COPY_FEEDBACK_MS);
  }

  async function connectWallet() {
    if (!window.ethereum) {
      window.open(CONFIG.launchpadUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CONFIG.chainIdHex,
            chainName: CONFIG.chainName,
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [CONFIG.rpcUrl],
            blockExplorerUrls: [CONFIG.explorerUrl],
          },
        ],
      });
    } catch {
      /* chain may already exist */
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.chainIdHex }],
      });
    } catch (error) {
      if (error?.code === 4902) {
        await connectWallet();
        return;
      }
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });
  }

  copyBtn?.addEventListener("click", copyContractAddress);
  document
    .getElementById("connect-wallet-btn")
    ?.addEventListener("click", connectWallet);

  refreshLiveStats();
  window.setInterval(refreshLiveStats, CONFIG.pollIntervalMs);
})();
