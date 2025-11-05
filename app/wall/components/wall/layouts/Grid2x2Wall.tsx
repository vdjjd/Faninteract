'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from "../../../../../lib/utils";

interface Grid2x2WallProps {
  event: any;
  posts: any[];
}

const speedMap: Record<string, number> = {
  Slow: 12000,
  Medium: 8000,
  Fast: 4000,
};

export default function Grid2x2Wall({ event, posts }: Grid2x2WallProps) {
  const [gridPosts, setGridPosts] = useState<(any | null)[]>(Array(4).fill(null));
  const [livePosts, setLivePosts] = useState(posts || []);
  const [displayDuration, setDisplayDuration] = useState(speedMap[event?.transition_speed || 'Medium']);

  const [bg, setBg] = useState(
    event?.background_type === 'image'
      ? `url(${event.background_value}) center/cover no-repeat`
      : event?.background_value || 'linear-gradient(to bottom right,#1b2735,#090a0f)'
  );
  const [title, setTitle] = useState(event?.title || 'Fan Zone Wall');
  const [logo, setLogo] = useState(event?.logo_url || '/faninteractlogo.png');

  const postIndex = useRef(0);
  const cellIndex = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resetKey = useRef(0);

  /* ✅ Fullscreen restore memory */
  const wasFullscreen = useRef(false);
  useEffect(() => {
    const handler = () => { wasFullscreen.current = !!document.fullscreenElement };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const ensureFullscreen = () => {
    if (wasFullscreen.current && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  /* ✅ Initial post load */
  const loadPosts = async () => {
    if (!event?.id) return;
    const { data } = await supabase
      .from('guest_posts')
      .select('*')
      .eq('fan_wall_id', event.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (data) {
      setLivePosts(data);
      const initial = data.slice(0, 4);
      setGridPosts(initial.concat(Array(4 - initial.length).fill(null)));
      postIndex.current = 4 % data.length;
      cellIndex.current = 0;
    }
  };

  useEffect(() => { loadPosts(); }, [event?.id]);

  /* ✅ Realtime posts */
  useEffect(() => {
    if (!event?.id) return;

    const postsChannel = supabase
      .channel(`grid2x2_posts_${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_posts', filter: `fan_wall_id=eq.${event.id}` },
        async (payload) => {
          const row = payload.new;

          if (payload.eventType === 'INSERT' && row?.status === 'approved') {
            setLivePosts(prev =>
              prev.some(p => p.id === row.id) ? prev : [row, ...prev]
            );
            ensureFullscreen();
          }

          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            await loadPosts();
            ensureFullscreen();
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(postsChannel);
  }, [event?.id]);

  /* ✅ Realtime fan wall settings */
  useEffect(() => {
    if (!event?.id) return;

    const settingsChannel = supabase
      .channel(`grid2x2_settings_${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fan_walls', filter: `id=eq.${event.id}` },
        (payload) => {
          const w = payload.new;
          if (!w) return;

          if (w.background_value) {
            setBg(
              w.background_type === 'image'
                ? `url(${w.background_value}) center/cover no-repeat`
                : w.background_value
            );
          }
          if (w.title) setTitle(w.title);
          if (w.logo_url) setLogo(w.logo_url);
          if (w.transition_speed) setDisplayDuration(speedMap[w.transition_speed]);

          ensureFullscreen();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(settingsChannel);
  }, [event?.id]);

  /* ✅ Grid cycling (fade only, same pattern) */
  useEffect(() => {
    if (!livePosts?.length) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const cycle = () => {
      const nextPost = livePosts[postIndex.current % livePosts.length];
      const cell = cellIndex.current % 4;

      setGridPosts(prev => {
        const updated = [...prev];
        updated[cell] = nextPost;
        return updated;
      });

      postIndex.current = (postIndex.current + 1) % livePosts.length;
      cellIndex.current = (cellIndex.current + 1) % 4;
    };

    intervalRef.current = setInterval(cycle, displayDuration);
    return () => clearInterval(intervalRef.current as NodeJS.Timeout);
  }, [livePosts, displayDuration, resetKey.current]);

  /* ✅ Fade animation only — preserved */
  const fadeVariants = {
    enter: { opacity: 0, scale: 0.98 },
    center: { opacity: 1, scale: 1, transition: { duration: 1.1, ease: 'easeInOut' }},
    exit: { opacity: 0, scale: 1.02, transition: { duration: 1.1, ease: 'easeInOut' }},
  };

  /* ✅ Post Card preserved exactly */
  function PostCard({ post }: { post: any }) {
    if (!post)
      return <div className={cn('flex items-center justify-center text-white text-lg opacity-60')}>Fan posts will appear here soon!</div>;

    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'row',
        borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow:'0 0 20px rgba(255,255,255,0.1),0 0 30px rgba(100,180,255,0.15)'
      }}>
        <div style={{ flex: 1, position: 'relative', padding: '2px 0 2px 2px' }}>
          {post.photo_url
            ? <img src={post.photo_url} style={{
                width:'100%', height:'100%', objectFit:'cover',
                borderRadius:10, opacity:0.9
              }}/>
            : <div style={{width:'100%',height:'100%',background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',color:'#999'}}>No photo</div>
          }
        </div>

        <div style={{
          flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between',
          background:'rgba(0,0,0,0.25)', backdropFilter:'blur(12px)',
          borderLeft:'1px solid rgba(255,255,255,0.15)', borderTopRightRadius:12, borderBottomRightRadius:12
        }}>
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'12px 18px'}}>
            <h3 style={{
              color:'#fff', fontWeight:800, fontSize:'clamp(1.6rem, 2.2vw, 2.4rem)',
              textShadow:'0 0 12px rgba(255,255,255,0.8), 0 0 20px rgba(100,180,255,0.6)', margin:0
            }}>{post.nickname}</h3>
          </div>

          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 18px 12px'}}>
            <p style={{
              color:'#ddd', fontSize:'clamp(1.1rem, 1.6vw, 1.8rem)', fontWeight:500,
              lineHeight:1.5, margin:0
            }}>{post.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: bg, width:'100%', height:'100vh', display:'flex',
      flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
      overflow:'hidden', position:'relative'
    }}>
      {/* Logo */}
      <div style={{ position:'absolute', top:'3vh', right:'3vw', width:'clamp(160px,18vw,220px)', zIndex:20 }}>
        <img src={logo} style={{ width:'100%', filter:'drop-shadow(0 0 12px rgba(0,0,0,0.85))' }}/>
      </div>

      {/* Title */}
      <h1 style={{
        color:'#fff', textAlign:'center',
        textShadow:'0 0 20px rgba(255,255,255,0.8),0 0 30px rgba(100,180,255,0.6)',
        fontWeight:900, marginTop:'3vh', marginBottom:'2vh',
        fontSize:'clamp(2.5rem,4vw,5rem)'
      }}>
        {title}
      </h1>

      {/* Grid */}
      <div style={{
        width:'80vw', height:'70vh', display:'grid',
        gridTemplateColumns:'repeat(2,1fr)', gridTemplateRows:'repeat(2,1fr)',
        borderRadius:20, overflow:'hidden',
        boxShadow:'10px 10px 30px rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.15)',
        background:'rgba(255,255,255,0.04)', backdropFilter:'blur(14px)'
      }}>
        {gridPosts.map((post, i) => (
          <AnimatePresence key={i} mode="wait">
            <motion.div
              key={(post?.id || 'empty') + '-' + i}
              variants={fadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ width:'100%', height:'100%' }}
            >
              <PostCard post={post} />
            </motion.div>
          </AnimatePresence>
        ))}
      </div>

      {/* QR */}
      <div style={{ position:'absolute', bottom:'4vh', left:'4vw', display:'flex', flexDirection:'column', align
        :'center' }}>
        <p style={{
          color:'#fff', fontWeight:700,
          textShadow:'0 0 12px rgba(255,255,255,0.8),0 0 20px rgba(100,180,255,0.6)'
        }}>
          Scan Me To Join
        </p>
        <div style={{
          padding:8, borderRadius:16,
          background:'rgba(255,255,255,0.05)',
          boxShadow:'0 0 25px rgba(255,255,255,0.6),0 0 40px rgba(255,255,255,0.3),inset 0 0 10px rgba(0,0,0,0.4)'
        }}>
          <QRCodeCanvas
            value={`https://faninteract.vercel.app/guest/signup?wall=${event?.id}`}
            size={140}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
            style={{ borderRadius:10 }}
          />
        </div>
      </div>

      {/* Fullscreen Button */}
      <div
        style={{
          position:'fixed', bottom:10, right:10, width:48, height:48, borderRadius:10,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
          zIndex:9999, opacity:0.25, background:'rgba(255,255,255,0.08)',
          backdropFilter:'blur(6px)', border:'1px solid rgba(255,255,255,0.2)'
        }}
        onClick={() =>
          !document.fullscreenElement
            ? document.documentElement.requestFullscreen().catch(() => {})
            : document.exitFullscreen()
        }
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" style={{ width:26, height:26 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V4h5M21 9V4h-5M3 15v5h5M21 15v5h-5"/>
        </svg>
      </div>
    </div>
  );
}
