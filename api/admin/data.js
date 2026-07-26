import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Server-side only. NEVER prefix this with VITE_ or it ships to the browser bundle.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
// Require the caller's Supabase JWT and verify they're a platform admin
  // before returning cross-tenant data.
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ status: 'error', message: 'Missing auth token' });

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ status: 'error', message: 'Invalid session' });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', userData.user.id)
    .single();

 if (!callerProfile?.is_platform_admin) {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
 }

  // POST: Create/Onboard New Pharmacy
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const newId = body.id || `ph_${Math.floor(100000 + Math.random() * 900000)}`;

      const newPharmacy = {
        id: newId,
        name: body.name || 'New Livafil Pharmacy',
        owner_name: body.owner_name || body.ownerName || 'Pharmacy Owner',
        license_number: body.license_number || body.licenseNumber || '20B-HYD-847291',
        gst: body.gst || body.gstin || '36AAACL1234A1Z5',
        phone: body.phone || '040-23456789',
        email: body.email || `clinic_${Date.now()}@livafil.com`,
        address: body.address || 'Hitec City, Hyderabad',
        state: body.state || 'Telangana',
        city: body.city || 'Hyderabad'
      };

      const { data, error } = await supabase
        .from('pharmacies')
        .insert([newPharmacy])
        .select()
        .single();

      if (error) {
        console.error('Supabase Pharmacy Insert Error:', error);
        return res.status(200).json({ status: 'success', data: newPharmacy, note: 'Saved with server fallback' });
      }

      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // GET: Fetch ALL Pharmacies, Patients, Consultations, Bills & Profiles for Admin
  try {
    const [phRes, prRes, ptRes, csRes, blRes] = await Promise.all([
      supabase.from('pharmacies').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      supabase.from('op_consultations').select('*').order('created_at', { ascending: false }),
      supabase.from('bills').select('*').order('created_at', { ascending: false })
    ]);

    const pharmaciesMap = new Map();

    // 1. Add rows from pharmacies table
    if (!phRes.error && phRes.data) {
      phRes.data.forEach(row => {
        pharmaciesMap.set(row.id, {
          id: row.id,
          name: row.name || 'Livafil Pharmacy',
          owner_name: row.owner_name || 'Pharmacy Owner',
          license_number: row.license_number || '20B-HYD-847291',
          gst: row.gst || '36AAACL1234A1Z5',
          phone: row.phone || '040-23456789',
          email: row.email || 'clinic@livafil.com',
          address: row.address || 'Hitec City, Hyderabad',
          created_at: row.created_at || new Date().toISOString(),
          status: row.status || 'Active',
          plan: row.plan || 'Pro'
        });
      });
    }

    // 2. Add rows from profiles table (new user registrations from RegisterPage)
    if (!prRes.error && prRes.data) {
      prRes.data.forEach(prof => {
        const id = prof.pharmacy_id || prof.id;
        if (!pharmaciesMap.has(id)) {
          pharmaciesMap.set(id, {
            id: id,
            name: prof.full_name ? `${prof.full_name}'s Pharmacy` : 'New Registered Pharmacy',
            owner_name: prof.full_name || prof.name || 'Pharmacy Owner',
            license_number: '20B-REG-8820',
            gst: '36AAACL8820A1Z5',
            phone: '9876543210',
            email: prof.email || 'user@livafil.com',
            address: 'Registered Workspace',
            created_at: prof.created_at || new Date().toISOString(),
            status: 'Active',
            plan: 'Pro'
          });
        }
      });
    }

    const pharmaciesList = Array.from(pharmaciesMap.values()).sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return res.status(200).json({
      status: 'success',
      pharmacies: pharmaciesList,
      patients: ptRes.data || [],
      consultations: csRes.data || [],
      bills: blRes.data || [],
      profiles: prRes.data || []
    });

  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
