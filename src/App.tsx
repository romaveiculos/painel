import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  BadgeCheck, CarFront, CheckCircle2, ChevronRight, CircleDollarSign, Eye,
  ImagePlus, LayoutDashboard, LoaderCircle, LogOut, MapPin, Menu, Pencil,
  Plus, Save, Settings, ShieldCheck, Trash2, Upload, Video, X,
} from 'lucide-react'
import { mediaUrl, supabase } from './lib/supabase'
import type { SiteSettings, Vehicle, VehicleMedia, VehicleStatus } from './types'

const BADGES = ['Baixo KM', 'Único dono', 'Laudo cautelar', 'Abaixo da FIPE']
const STATUS: Record<VehicleStatus, string> = { draft: 'Rascunho', published: 'Publicado', sold: 'Vendido', archived: 'Arquivado' }
const emptySettings: SiteSettings = {
  id: true, business_name: 'Roma Veículos', whatsapp: '5562998306826', instagram_url: '', facebook_url: '',
  email: '', address_line: '', city: 'Goiânia', state: 'GO', postal_code: '', maps_url: '', opening_hours: '',
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((event, next) => { setSession(next); if (event === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])
  if (loading) return <FullLoader text="Abrindo painel..." />
  if (session && recovery) return <PasswordReset onDone={() => setRecovery(false)} />
  return session ? <AdminGate session={session} /> : <AuthScreen />
}

function PasswordReset({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('')
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false); if (error) setMessage(error.message); else onDone() }
  return <main className="auth-shell"><section className="auth-brand"><img src="/logo-roma.png" alt="Roma Veículos" /><div><span>RECUPERAÇÃO SEGURA</span><h1>Crie sua nova senha.</h1><p>Escolha uma senha forte que só a equipe responsável conheça.</p></div></section><section className="auth-card"><div className="auth-title"><ShieldCheck /><div><small>NOVA SENHA</small><h2>Atualizar acesso</h2></div></div><form onSubmit={submit}><Field label="Nova senha"><input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" /></Field>{message && <div className="form-message">{message}</div>}<button className="primary full" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Save />}Salvar nova senha</button></form></section></main>
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    const response = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { name: 'Roma Veículos' }, emailRedirectTo: window.location.origin } })
    if (response.error) setMessage(response.error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : response.error.message)
    else if (mode === 'signup' && !response.data.session) setMessage('Cadastro criado. Confirme o e-mail recebido e depois entre no painel.')
    setBusy(false)
  }
  async function recover() {
    if (!email) return setMessage('Informe o e-mail primeiro.')
    setBusy(true); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    setMessage(error ? error.message : 'Enviamos as instruções de recuperação para o e-mail.'); setBusy(false)
  }
  return <main className="auth-shell">
    <section className="auth-brand"><img src="/logo-roma.png" alt="Roma Veículos" /><div><span>Painel administrativo</span><h1>Seu estoque, simples de cuidar.</h1><p>Publique veículos, organize fotos e atualize os contatos do site em poucos passos.</p></div></section>
    <section className="auth-card">
      <div className="auth-title"><ShieldCheck /><div><small>ACESSO SEGURO</small><h2>{mode === 'login' ? 'Entrar no painel' : 'Criar primeiro acesso'}</h2></div></div>
      <form onSubmit={submit}>
        <Field label="E-mail"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></Field>
        <Field label="Senha"><input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
        {message && <div className="form-message">{message}</div>}
        <button className="primary full" disabled={busy}>{busy && <LoaderCircle className="spin" />}{mode === 'login' ? 'Entrar' : 'Criar acesso'}</button>
      </form>
      <div className="auth-links"><button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Criar primeiro acesso' : 'Já tenho uma senha'}</button>{mode === 'login' && <button onClick={recover}>Esqueci minha senha</button>}</div>
      <p className="security-note">Somente o e-mail autorizado pela Roma Veículos consegue acessar.</p>
    </section>
  </main>
}

function AdminGate({ session }: { session: Session }) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  useEffect(() => { supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle().then(({ data }) => setAllowed(Boolean(data))) }, [session.user.id])
  if (allowed === null) return <FullLoader text="Confirmando acesso..." />
  if (!allowed) return <main className="denied"><ShieldCheck /><h1>Acesso não autorizado</h1><p>Esta conta não está na lista de administradores da Roma Veículos.</p><button className="primary" onClick={() => supabase.auth.signOut()}>Voltar</button></main>
  return <AdminApp session={session} />
}

type View = 'dashboard' | 'vehicles' | 'editor' | 'settings'
function AdminApp({ session }: { session: Session }) {
  const [view, setView] = useState<View>('dashboard')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [settings, setSettings] = useState<SiteSettings>(emptySettings)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [menu, setMenu] = useState(false)
  async function load() {
    setLoading(true)
    const [cars, config] = await Promise.all([
      supabase.from('vehicles').select('*, vehicle_media(*)').order('updated_at', { ascending: false }),
      supabase.from('site_settings').select('*').eq('id', true).single(),
    ])
    if (cars.data) setVehicles(cars.data as Vehicle[])
    if (config.data) setSettings(config.data as SiteSettings)
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  function openNew() { setEditing(null); setView('editor'); setMenu(false) }
  function openEdit(car: Vehicle) { setEditing(car); setView('editor'); setMenu(false) }
  const published = vehicles.filter(v => v.status === 'published').length
  const sold = vehicles.filter(v => v.status === 'sold').length
  return <div className="admin-shell">
    <aside className={menu ? 'sidebar open' : 'sidebar'}>
      <button className="sidebar-close" onClick={() => setMenu(false)} aria-label="Fechar menu"><X /></button>
      <img className="sidebar-logo" src="/logo-roma.png" alt="Roma Veículos" />
      <div className="side-title">PAINEL ADMINISTRATIVO</div>
      <nav>
        <Nav active={view === 'dashboard'} icon={<LayoutDashboard />} label="Visão geral" onClick={() => { setView('dashboard'); setMenu(false) }} />
        <Nav active={view === 'vehicles'} icon={<CarFront />} label="Veículos" count={vehicles.length} onClick={() => { setView('vehicles'); setMenu(false) }} />
        <Nav active={view === 'editor'} icon={<Plus />} label="Novo anúncio" onClick={openNew} />
        <Nav active={view === 'settings'} icon={<Settings />} label="Dados da loja" onClick={() => { setView('settings'); setMenu(false) }} />
      </nav>
      <div className="side-help"><CheckCircle2 /><div><strong>Alterações em tempo real</strong><span>O site recebe os dados salvos aqui.</span></div></div>
      <button className="logout" onClick={() => supabase.auth.signOut()}><LogOut /> Sair do painel</button>
    </aside>
    {menu && <button className="backdrop" onClick={() => setMenu(false)} aria-label="Fechar menu" />}
    <main className="workspace">
      <header className="topbar"><button className="menu-button" onClick={() => setMenu(true)}><Menu /></button><div><small>ROMA VEÍCULOS</small><strong>{view === 'editor' ? (editing ? 'Editar anúncio' : 'Novo anúncio') : view === 'settings' ? 'Dados da loja' : view === 'vehicles' ? 'Estoque' : 'Visão geral'}</strong></div><div className="user-chip"><span>{session.user.email?.slice(0, 1).toUpperCase()}</span><div><strong>Administrador</strong><small>{session.user.email}</small></div></div></header>
      <div className="content">
        {loading ? <FullLoader text="Carregando informações..." inline /> : view === 'dashboard' ? <Dashboard vehicles={vehicles} published={published} sold={sold} openNew={openNew} openEdit={openEdit} /> : view === 'vehicles' ? <VehicleList vehicles={vehicles} openNew={openNew} openEdit={openEdit} reload={load} /> : view === 'editor' ? <VehicleEditor vehicle={editing} userId={session.user.id} onDone={async () => { await load(); setView('vehicles') }} onCancel={() => setView('vehicles')} /> : <SettingsForm value={settings} onSaved={async () => { await load(); setView('dashboard') }} />}
      </div>
    </main>
  </div>
}

function Dashboard({ vehicles, published, sold, openNew, openEdit }: { vehicles: Vehicle[]; published: number; sold: number; openNew: () => void; openEdit: (v: Vehicle) => void }) {
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date()).toUpperCase()
  return <><div className="page-heading"><div><span>{today}</span><h1>Olá! O que vamos anunciar hoje?</h1><p>Acompanhe seu estoque e faça alterações sem precisar mexer no site.</p></div><button className="primary" onClick={openNew}><Plus /> Novo veículo</button></div>
    <div className="stats"><Stat icon={<CarFront />} label="Total no estoque" value={vehicles.length} /><Stat icon={<Eye />} label="Publicados no site" value={published} tone="green" /><Stat icon={<CircleDollarSign />} label="Vendidos" value={sold} tone="gold" /></div>
    <section className="panel"><div className="panel-title"><div><small>ALTERADOS RECENTEMENTE</small><h2>Últimos veículos</h2></div><span>{vehicles.length} anúncios</span></div>{vehicles.length ? <div className="recent-list">{vehicles.slice(0, 5).map(v => <VehicleRow key={v.id} vehicle={v} onEdit={() => openEdit(v)} />)}</div> : <EmptyState onClick={openNew} />}</section>
  </>
}

function VehicleList({ vehicles, openNew, openEdit, reload }: { vehicles: Vehicle[]; openNew: () => void; openEdit: (v: Vehicle) => void; reload: () => Promise<void> }) {
  const [filter, setFilter] = useState('')
  const shown = vehicles.filter(v => `${v.brand} ${v.model} ${v.version}`.toLowerCase().includes(filter.toLowerCase()))
  async function remove(vehicle: Vehicle) {
    if (!confirm(`Excluir definitivamente o anúncio de ${vehicle.brand} ${vehicle.model}?`)) return
    const paths = vehicle.vehicle_media?.map(m => m.storage_path) || []
    if (paths.length) await supabase.storage.from('vehicle-media').remove(paths)
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id)
    if (error) alert(error.message); else await reload()
  }
  return <><div className="page-heading compact"><div><span>GERENCIAR ESTOQUE</span><h1>Veículos</h1><p>Edite preços, marque como vendido ou remova um anúncio.</p></div><button className="primary" onClick={openNew}><Plus /> Novo veículo</button></div>
    <section className="panel"><div className="list-tools"><input placeholder="Buscar por marca ou modelo..." value={filter} onChange={e => setFilter(e.target.value)} /><span>{shown.length} encontrados</span></div><div className="recent-list">{shown.map(v => <VehicleRow key={v.id} vehicle={v} onEdit={() => openEdit(v)} onDelete={() => remove(v)} />)}{!shown.length && <EmptyState onClick={openNew} />}</div></section>
  </>
}

function VehicleRow({ vehicle, onEdit, onDelete }: { vehicle: Vehicle; onEdit: () => void; onDelete?: () => void }) {
  const cover = vehicle.vehicle_media?.find(m => m.is_cover) || vehicle.vehicle_media?.find(m => m.kind === 'image')
  return <article className="vehicle-row"><div className="vehicle-thumb">{cover ? <img src={mediaUrl(cover.storage_path)} alt="" style={{ objectPosition: cover.object_position }} /> : <CarFront />}</div><div className="vehicle-main"><strong>{vehicle.brand} {vehicle.model}</strong><span>{vehicle.version || 'Versão não informada'} · {vehicle.year_manufacture}/{vehicle.year_model}</span></div><div className="vehicle-price">{Number(vehicle.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<small>{vehicle.mileage.toLocaleString('pt-BR')} km</small></div><span className={`status ${vehicle.status}`}>{STATUS[vehicle.status]}</span><div className="row-actions"><button onClick={onEdit} title="Editar"><Pencil /></button>{onDelete && <button className="danger-icon" onClick={onDelete} title="Excluir"><Trash2 /></button>}<button onClick={onEdit}><ChevronRight /></button></div></article>
}

type PendingFile = { file: File; preview: string; kind: 'image' | 'video' }
function VehicleEditor({ vehicle, userId, onDone, onCancel }: { vehicle: Vehicle | null; userId: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ status: (vehicle?.status || 'draft') as VehicleStatus, featured: vehicle?.featured || false, brand: vehicle?.brand || '', model: vehicle?.model || '', version: vehicle?.version || '', year_manufacture: vehicle?.year_manufacture || new Date().getFullYear(), year_model: vehicle?.year_model || new Date().getFullYear(), mileage: vehicle?.mileage || 0, price: Number(vehicle?.price || 0), transmission: vehicle?.transmission || '', fuel: vehicle?.fuel || '', color: vehicle?.color || '', body_type: vehicle?.body_type || '', description: vehicle?.description || '', optional_items: vehicle?.optional_items?.join(', ') || '', badges: vehicle?.badges || [] as string[] })
  const [media, setMedia] = useState<VehicleMedia[]>(vehicle?.vehicle_media || [])
  const [pending, setPending] = useState<PendingFile[]>([])
  const [pendingCover, setPendingCover] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }))
  function filesSelected(files: FileList | null) {
    if (!files) return
    const accepted: PendingFile[] = []
    Array.from(files).forEach(file => {
      const kind = file.type.startsWith('video/') ? 'video' : 'image'
      if (kind === 'video' && file.size > 50 * 1024 * 1024) return alert(`${file.name}: o vídeo deve ter no máximo 50 MB.`)
      if (kind === 'image' && file.size > 20 * 1024 * 1024) return alert(`${file.name}: a foto deve ter no máximo 20 MB.`)
      accepted.push({ file, kind, preview: URL.createObjectURL(file) })
    })
    setPending(prev => [...prev, ...accepted]); if (pendingCover === null && !media.some(m => m.is_cover)) setPendingCover(pending.length)
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setProgress('Salvando dados do veículo...')
    const slugBase = `${form.brand}-${form.model}-${form.year_model}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const payload = { ...form, optional_items: form.optional_items.split(',').map(x => x.trim()).filter(Boolean), slug: vehicle?.slug || `${slugBase}-${Date.now().toString().slice(-5)}`, updated_by: userId, created_by: vehicle?.id ? undefined : userId, published_at: form.status === 'published' ? new Date().toISOString() : null }
    const query = vehicle?.id ? supabase.from('vehicles').update(payload).eq('id', vehicle.id).select().single() : supabase.from('vehicles').insert(payload).select().single()
    const { data: saved, error } = await query
    if (error || !saved) { alert(error?.message || 'Não foi possível salvar.'); setBusy(false); return }
    const hasCover = media.some(m => m.is_cover)
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i]; setProgress(`Enviando arquivo ${i + 1} de ${pending.length}...`)
      const upload = item.kind === 'image' ? await optimizeImage(item.file) : item.file
      const extension = item.kind === 'image' ? 'jpg' : (item.file.name.split('.').pop()?.toLowerCase() || 'mp4')
      const path = `${saved.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('vehicle-media').upload(path, upload, { contentType: item.kind === 'image' ? 'image/jpeg' : item.file.type, cacheControl: '31536000' })
      if (uploadError) { alert(`Falha ao enviar ${item.file.name}: ${uploadError.message}`); continue }
      await supabase.from('vehicle_media').insert({ vehicle_id: saved.id, kind: item.kind, storage_path: path, alt_text: `${form.brand} ${form.model}`, sort_order: media.length + i, is_cover: item.kind === 'image' && ((!hasCover && pendingCover === null && i === 0) || pendingCover === i) })
    }
    setProgress('Anúncio salvo!'); setBusy(false); onDone()
  }
  async function makeCover(item: VehicleMedia) {
    await supabase.from('vehicle_media').update({ is_cover: false }).eq('vehicle_id', item.vehicle_id)
    await supabase.from('vehicle_media').update({ is_cover: true }).eq('id', item.id)
    setMedia(prev => prev.map(m => ({ ...m, is_cover: m.id === item.id })))
  }
  async function deleteMedia(item: VehicleMedia) {
    if (!confirm('Remover esta mídia?')) return
    await supabase.storage.from('vehicle-media').remove([item.storage_path]); await supabase.from('vehicle_media').delete().eq('id', item.id)
    setMedia(prev => prev.filter(m => m.id !== item.id))
  }
  return <form onSubmit={save}><div className="page-heading compact"><div><span>{vehicle ? 'EDITAR ANÚNCIO' : 'NOVO ANÚNCIO'}</span><h1>{vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Cadastrar veículo'}</h1><p>Preencha os dados e escolha as melhores fotos. Você pode salvar como rascunho.</p></div><div className="heading-actions"><button type="button" className="secondary" onClick={onCancel}>Cancelar</button><button className="primary" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Save />}{busy ? progress : 'Salvar anúncio'}</button></div></div>
    <section className="editor-grid"><div className="editor-main">
      <FormSection title="Informações principais" subtitle="Os campos com * são obrigatórios."><div className="form-grid"><Field label="Marca *"><input value={form.brand} onChange={e => set('brand', e.target.value)} required placeholder="Ex.: Toyota" /></Field><Field label="Modelo *"><input value={form.model} onChange={e => set('model', e.target.value)} required placeholder="Ex.: Corolla" /></Field><Field label="Versão"><input value={form.version} onChange={e => set('version', e.target.value)} placeholder="Ex.: XEi 2.0 Flex" /></Field><Field label="Carroceria"><input value={form.body_type} onChange={e => set('body_type', e.target.value)} placeholder="Ex.: Sedã" /></Field><Field label="Ano fabricação *"><input type="number" value={form.year_manufacture} onChange={e => set('year_manufacture', Number(e.target.value))} required /></Field><Field label="Ano modelo *"><input type="number" value={form.year_model} onChange={e => set('year_model', Number(e.target.value))} required /></Field><Field label="Quilometragem"><input type="number" min="0" value={form.mileage} onChange={e => set('mileage', Number(e.target.value))} /></Field><Field label="Preço (R$) *"><input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', Number(e.target.value))} required /></Field><Field label="Câmbio"><select value={form.transmission} onChange={e => set('transmission', e.target.value)}><option value="">Selecione</option><option>Automático</option><option>Manual</option><option>CVT</option><option>Automatizado</option></select></Field><Field label="Combustível"><select value={form.fuel} onChange={e => set('fuel', e.target.value)}><option value="">Selecione</option><option>Flex</option><option>Gasolina</option><option>Diesel</option><option>Elétrico</option><option>Híbrido</option></select></Field><Field label="Cor"><input value={form.color} onChange={e => set('color', e.target.value)} /></Field></div></FormSection>
      <FormSection title="Fotos e vídeo" subtitle="As fotos são reduzidas automaticamente sem deformar. Vídeo é opcional."><label className="upload-zone"><Upload /><strong>Selecionar fotos ou vídeo</strong><span>Fotos JPG, PNG ou WEBP · vídeo MP4, WEBM ou MOV</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={e => filesSelected(e.target.files)} /></label><div className="media-grid">{media.map(item => <div className={`media-card ${item.is_cover ? 'cover' : ''}`} key={item.id}>{item.kind === 'image' ? <img src={mediaUrl(item.storage_path)} alt="" style={{ objectPosition: item.object_position }} /> : <video src={mediaUrl(item.storage_path)} />}{item.is_cover && <span className="cover-label">CAPA</span>}<div className="media-actions">{item.kind === 'image' && !item.is_cover && <button type="button" onClick={() => makeCover(item)}>Usar como capa</button>}<button type="button" onClick={() => deleteMedia(item)}><Trash2 /></button></div></div>)}{pending.map((item, index) => <div className={`media-card pending ${pendingCover === index ? 'cover' : ''}`} key={item.preview}>{item.kind === 'image' ? <img src={item.preview} alt="Prévia" /> : <video src={item.preview} />}{pendingCover === index && <span className="cover-label">CAPA</span>}<div className="media-actions">{item.kind === 'image' && <button type="button" onClick={() => setPendingCover(index)}>Usar como capa</button>}<button type="button" onClick={() => setPending(prev => prev.filter((_, i) => i !== index))}><X /></button></div></div>)}</div></FormSection>
      <FormSection title="Descrição e opcionais"><Field label="Opcionais (separe por vírgulas)"><textarea value={form.optional_items} onChange={e => set('optional_items', e.target.value)} placeholder="Ar-condicionado, Direção elétrica, Câmera de ré" /></Field><Field label="Observações"><textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Conte os principais diferenciais do veículo..." /></Field></FormSection>
    </div><aside className="editor-side"><FormSection title="Publicação"><Field label="Situação"><select value={form.status} onChange={e => set('status', e.target.value as VehicleStatus)}><option value="draft">Rascunho</option><option value="published">Publicado no site</option><option value="sold">Vendido</option><option value="archived">Arquivado</option></select></Field><label className="check-row"><input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} /><span><strong>Destacar veículo</strong><small>Aparece primeiro no estoque.</small></span></label></FormSection><FormSection title="Selos do anúncio" subtitle="Escolha os diferenciais que aparecem sobre a foto."><div className="badge-options">{BADGES.map(badge => <label key={badge} className={form.badges.includes(badge) ? 'selected' : ''}><input type="checkbox" checked={form.badges.includes(badge)} onChange={() => set('badges', form.badges.includes(badge) ? form.badges.filter(x => x !== badge) : [...form.badges, badge])} /><BadgeCheck /><span>{badge}</span></label>)}</div></FormSection></aside></section>
  </form>
}

async function optimizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const max = 1920; const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao preparar imagem')), 'image/jpeg', .88))
}

function SettingsForm({ value, onSaved }: { value: SiteSettings; onSaved: () => void }) {
  const [form, setForm] = useState(value); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false)
  const set = (key: keyof SiteSettings, next: string) => setForm(prev => ({ ...prev, [key]: next }))
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setSaved(false); const { error } = await supabase.from('site_settings').update(form).eq('id', true); setBusy(false); if (error) alert(error.message); else { setSaved(true); setTimeout(onSaved, 700) } }
  return <form onSubmit={submit}><div className="page-heading compact"><div><span>CONFIGURAÇÕES DO SITE</span><h1>Dados da loja</h1><p>Essas informações aparecem automaticamente no cabeçalho, rodapé e botões.</p></div><button className="primary" disabled={busy}>{saved ? <CheckCircle2 /> : <Save />}{saved ? 'Salvo!' : busy ? 'Salvando...' : 'Salvar alterações'}</button></div><section className="settings-layout"><FormSection title="Contato"><div className="form-grid"><Field label="Nome da loja"><input value={form.business_name} onChange={e => set('business_name', e.target.value)} /></Field><Field label="WhatsApp com DDD"><input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value.replace(/\D/g, ''))} /></Field><Field label="E-mail"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field><Field label="Horário de atendimento"><input value={form.opening_hours} onChange={e => set('opening_hours', e.target.value)} /></Field></div></FormSection><FormSection title="Endereço"><div className="form-grid"><Field label="Rua, quadra e lote"><input value={form.address_line} onChange={e => set('address_line', e.target.value)} /></Field><Field label="Cidade"><input value={form.city} onChange={e => set('city', e.target.value)} /></Field><Field label="Estado"><input value={form.state} maxLength={2} onChange={e => set('state', e.target.value.toUpperCase())} /></Field><Field label="CEP"><input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} /></Field><Field label="Link do Google Maps"><input value={form.maps_url} onChange={e => set('maps_url', e.target.value)} /></Field></div></FormSection><FormSection title="Redes sociais"><div className="form-grid"><Field label="Instagram"><input value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} placeholder="https://instagram.com/..." /></Field><Field label="Facebook (opcional)"><input value={form.facebook_url} onChange={e => set('facebook_url', e.target.value)} placeholder="https://facebook.com/..." /></Field></div></FormSection></section></form>
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }
function FormSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) { return <section className="form-section"><div className="form-section-title"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{children}</section> }
function Nav({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) { return <button className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <b>{count}</b>}</button> }
function Stat({ icon, label, value, tone = '' }: { icon: ReactNode; label: string; value: number; tone?: string }) { return <div className={`stat ${tone}`}><div>{icon}</div><span>{label}</span><strong>{value}</strong></div> }
function EmptyState({ onClick }: { onClick: () => void }) { return <div className="empty"><ImagePlus /><h3>Nenhum veículo por aqui</h3><p>Cadastre o primeiro anúncio para começar.</p><button className="secondary" onClick={onClick}><Plus /> Cadastrar veículo</button></div> }
function FullLoader({ text, inline = false }: { text: string; inline?: boolean }) { return <div className={inline ? 'loader inline' : 'loader'}><LoaderCircle className="spin" /><span>{text}</span></div> }

export default App
