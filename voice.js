(() => {
  const SUPABASE_URL = "https://eznroomijdzsdxdyfjru.supabase.co";
  const SUPABASE_KEY = "sb_publishable_D54kU52D5ewlrGYqS8vVdA_kdditGvO";

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);

  const panel = $('voicePanel'), statusEl = $('voiceStatus');
  const joinB = $('voiceJoin'), muteB = $('voiceMute'), leaveB = $('voiceLeave');
  const btn = $('voiceBtn'), roomSel = $('voiceRoom');
  const peopleEl = $('voicePeople'), audioBox = $('voiceAudio');

  const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  let stream = null, channel = null, myId = null, myName = '';
  let peers = {};          // userId -> { pc, audio, pending: [] }
  let joined = false;

  const setStatus = t => { statusEl.textContent = t; };

  const setUI = on => {
    joined = on;
    joinB.hidden = on;
    muteB.hidden = leaveB.hidden = !on;
    roomSel.disabled = on;
    btn.classList.toggle('live', on);
  };

  const renderPeople = state => {
    peopleEl.innerHTML = '';
    Object.keys(state || {}).forEach(key => {
      const meta = state[key][0] || {};
      const li = document.createElement('li');
      if (key === myId) li.className = 'me';
      const dot = document.createElement('span');
      dot.className = 'dot';
      const name = document.createElement('span');
      name.textContent = (meta.name || 'İstifadəçi') + (key === myId ? ' (siz)' : '');
      li.append(dot, name);
      peopleEl.appendChild(li);
    });
  };

  const sendSignal = (to, type, data) => {
    channel.send({ type: 'broadcast', event: 'signal', payload: { to, from: myId, type, data } });
  };

  const closePeer = id => {
    const p = peers[id];
    if (!p) return;
    try { p.pc.close(); } catch (e) {}
    p.audio.srcObject = null;
    p.audio.remove();
    delete peers[id];
  };

  const createPeer = id => {
    if (peers[id]) return peers[id];
    const pc = new RTCPeerConnection(ICE);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;
    audioBox.appendChild(audio);

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = e => { audio.srcObject = e.streams[0]; };
    pc.onicecandidate = e => {
      if (e.candidate) sendSignal(id, 'ice', e.candidate.toJSON());
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') closePeer(id);
    };

    peers[id] = { pc, audio, pending: [] };
    return peers[id];
  };

  const flushPending = async p => {
    while (p.pending.length) {
      try { await p.pc.addIceCandidate(p.pending.shift()); } catch (e) {}
    }
  };

  const onSignal = async ({ payload }) => {
    if (!payload || payload.to !== myId || !stream) return;
    const { from, type, data } = payload;

    try {
      if (type === 'offer') {
        const p = createPeer(from);
        await p.pc.setRemoteDescription(data);
        await flushPending(p);
        const answer = await p.pc.createAnswer();
        await p.pc.setLocalDescription(answer);
        sendSignal(from, 'answer', p.pc.localDescription.toJSON());
      } else if (type === 'answer') {
        const p = peers[from];
        if (!p) return;
        await p.pc.setRemoteDescription(data);
        await flushPending(p);
      } else if (type === 'ice') {
        const p = peers[from];
        if (!p) return;
        if (p.pc.remoteDescription) {
          try { await p.pc.addIceCandidate(data); } catch (e) {}
        } else {
          p.pending.push(data);
        }
      }
    } catch (e) {
      console.error('Səs siqnalı xətası:', e);
    }
  };

  const callPeer = async id => {
    const p = createPeer(id);
    const offer = await p.pc.createOffer();
    await p.pc.setLocalDescription(offer);
    sendSignal(id, 'offer', p.pc.localDescription.toJSON());
  };

  const requireLogin = () => {
    setStatus('Səsli otağa qoşulmaq üçün əvvəl daxil olun');
    panel.hidden = true;
    // Giriş pəncərəsini açmaq üçün topbar-dakı giriş düyməsinə basılır
    const loginBtn = document.querySelector('#auth button, #auth a');
    if (loginBtn) loginBtn.click();
  };

  const leave = async (message) => {
    Object.keys(peers).forEach(closePeer);
    if (channel) {
      try { await channel.untrack(); } catch (e) {}
      try { await sb.removeChannel(channel); } catch (e) {}
      channel = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    peopleEl.innerHTML = '';
    muteB.textContent = 'Səssiz';
    setVoicePresence(null);
    setUI(false);
    setStatus(message || 'Otaqdan çıxdınız');
  };

  const join = async () => {
    if (joined) return;

    // 1) Giriş yoxlanışı
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { requireLogin(); return; }

    const user = session.user;
    myId = user.id;
    const meta = user.user_metadata || {};
    myName = meta.username || meta.name || meta.full_name || 'İstifadəçi';

    // 2) Mikrofon
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Brauzer mikrofonu dəstəkləmir (HTTPS lazımdır)');
      return;
    }
    try {
      setStatus('Mikrofon yoxlanılır...');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (e) {
      setStatus(e.name === 'NotAllowedError' ? 'Mikrofon icazəsi verilmədi' : 'Mikrofon tapılmadı');
      return;
    }

    // 3) Otağa qoşulma
    const room = roomSel.value;
    await sb.realtime.setAuth(session.access_token);
    setStatus('Otağa qoşulur...');

    channel = sb.channel('voice:' + room, {
      config: { private: true, broadcast: { self: false }, presence: { key: myId } }
    });

    let firstSync = true;

    channel
      .on('broadcast', { event: 'signal' }, onSignal)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        renderPeople(state);
        // Yeni qoşulan, otaqdakı hər kəsə zəng edir
        if (firstSync) {
          firstSync = false;
          Object.keys(state).filter(k => k !== myId).forEach(callPeer);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => closePeer(key))
            .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: myName });
          setVoicePresence(room);
          setUI(true);
          setStatus('Qoşuldunuz: ' + names[room]);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime status:', status, err);
          leave('Qoşulmaq alınmadı. Konsola baxın (F12).');
        }
      });
  };
  // ===== AKTİV SAYĞACI (hamı üçün, adsız) =====
  const names = {};
  [...roomSel.options].forEach(o => { names[o.value] = o.textContent; });

  const badge = document.createElement('span');
  badge.className = 'voice-badge';
  badge.hidden = true;
  btn.appendChild(badge);

  const countCh = sb.channel('voice-count', {
    config: { presence: { key: 'v' + Math.random().toString(36).slice(2) } }
  });

  const renderCounts = () => {
    const counts = {};
    let total = 0;
    Object.values(countCh.presenceState()).forEach(list => {
      list.forEach(m => {
        if (m.room) { counts[m.room] = (counts[m.room] || 0) + 1; total++; }
      });
    });
    badge.textContent = total;
    badge.hidden = total === 0;
    btn.title = total ? 'Səsli otaqda ' + total + ' nəfər aktivdir' : 'Səsli otaq';
    [...roomSel.options].forEach(o => {
      const c = counts[o.value] || 0;
      o.textContent = names[o.value] + (c ? ' (' + c + ')' : '');
    });
  };

  countCh.on('presence', { event: 'sync' }, renderCounts).subscribe();

  const setVoicePresence = async room => {
    try {
      if (room) await countCh.track({ room });
      else await countCh.untrack();
    } catch (e) {}
  };


  // Düymələr
  btn.onclick = () => { panel.hidden = !panel.hidden; };
  $('voiceClose').onclick = () => { panel.hidden = true; };
  joinB.onclick = join;
  leaveB.onclick = () => leave();

  muteB.onclick = () => {
    if (!stream) return;
    const t = stream.getAudioTracks()[0];
    t.enabled = !t.enabled;
    muteB.textContent = t.enabled ? 'Səssiz' : 'Səsi aç';
    setStatus(t.enabled ? 'Mikrofon aktivdir' : 'Mikrofon söndürülüb');
  };

  // Hesabdan çıxanda səsdən də avtomatik çıxsın
  sb.auth.onAuthStateChange((event, session) => {
    if (!session && joined) leave('Hesabdan çıxdınız, səsli otaqdan da çıxarıldınız');
  });

  window.addEventListener('beforeunload', () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  });
})();