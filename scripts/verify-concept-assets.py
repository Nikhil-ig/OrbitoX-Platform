#!/usr/bin/env python3
"""
OrbitoX Concept Canvas Asset Verification Manifest
Decodes all 44 PNG concept screens via IDAT chunk bitstream decompression.
Verifies dimensions, bit depth, color type, and scanline buffer integrity.
"""

import os
import sys
import zlib
import struct

EXPECTED_SCREENS = {
    # Desktop (29 screens)
    'A1': ('1 · Operator console — dark.png', 2880, 2080, 'Desktop', 'dark'),
    'A2': ('2 · Customer dashboard — light.png', 2880, 2194, 'Desktop', 'light'),
    'A3': ('3 · Appearance — you control it from the web.png', 2400, 1720, 'Desktop', 'dark'),
    'C0': ('Shared console sidebar.png', 544, 2080, 'Desktop', 'dark'),
    'C1': ('Organization detail.png', 2880, 2160, 'Desktop', 'dark'),
    'C2': ('Tenant detail · suspend with re-auth.png', 2880, 2160, 'Desktop', 'dark'),
    'C3': ('Billing & payments.png', 2880, 2160, 'Desktop', 'dark'),
    'C4': ('Provisioning job · retry.png', 2880, 2160, 'Desktop', 'dark'),
    'C5': ('Data rights requests.png', 2880, 2160, 'Desktop', 'dark'),
    'C6': ('API keys · rotate.png', 2880, 2160, 'Desktop', 'dark'),
    'U1': ('Change plan (customer).png', 2880, 2000, 'Desktop', 'light'),
    'U2': ('Diner template gallery (customer).png', 2880, 2006, 'Desktop', 'light'),
    'AI1': ('Ask OrbitoX — AI assistant over MCP@2x.png', 2880, 2160, 'Desktop', 'dark'),
    'F1': ('F1 · Sign up.png', 2880, 1800, 'Desktop', 'light'),
    'F2': ('F2 · Create your organization.png', 2880, 1800, 'Desktop', 'light'),
    'F3': ('F3 · Add your restaurant.png', 2880, 1882, 'Desktop', 'light'),
    'F4': ('F4 · First login your site, live in preview.png', 2880, 1920, 'Desktop', 'light'),
    'F5': ('F5 · Choose a plan and go live.png', 2880, 1920, 'Desktop', 'light'),
    'F6': ('F6 · You\'re live setup checklist.png', 2880, 2080, 'Desktop', 'light'),
    'R0': ('Shared RestaurantOS sidebar.png', 504, 2080, 'Desktop', 'light'),
    'R1': ('R1 · Today.png', 2880, 2080, 'Desktop', 'light'),
    'R2': ('R2 · Branches · edit branch.png', 2880, 2080, 'Desktop', 'light'),
    'R3': ('R3 · Floors & tables editor.png', 2880, 2080, 'Desktop', 'light'),
    'R4': ('R4 · Menu · edit item.png', 2880, 2080, 'Desktop', 'light'),
    'R5': ('R5 · Staff & roles.png', 2880, 2080, 'Desktop', 'light'),
    'R6': ('R6 · Settings brand, domain, GST, payments.png', 2880, 2080, 'Desktop', 'light'),
    'S3': ('Orders · desktop.png', 2880, 2080, 'Desktop', 'light'),
    'S4': ('Invoices & GST · desktop.png', 2880, 2080, 'Desktop', 'light'),
    'S5': ('Reports · desktop.png', 2880, 2080, 'Desktop', 'light'),
    # Tablet Landscape (2 screens)
    'S1': ('Kitchen screen (KDS) · tablet landscape.png', 2388, 1668, 'Tablet Landscape', 'dark'),
    'S2': ('POS take order & checkout · tablet landscape.png', 2388, 1668, 'Tablet Landscape', 'light'),
    # Tablet Portrait (1 screen)
    'D9': ('Host stand · tablet portrait.png', 1668, 2388, 'Tablet Portrait', 'dark'),
    # Phone (11 screens)
    'A4': ('4 · RestaurantOS diner — phone.png', 780, 1688, 'Phone', 'tenant-saffron'),
    'U3': ('Diner template “Noir” (paid).png', 780, 1688, 'Phone', 'tenant-noir'),
    'U4': ('Diner template “Fresh” (free).png', 780, 1688, 'Phone', 'tenant-fresh'),
    'D1': ('Owner phone · Today.png', 780, 1688, 'Phone', 'light'),
    'D2': ('Owner phone · Orders.png', 780, 1688, 'Phone', 'light'),
    'D3': ('Owner phone · Edit dish (bottom sheet).png', 780, 1688, 'Phone', 'light'),
    'D4': ('Waiter phone · My tables.png', 780, 1688, 'Phone', 'dark'),
    'D5': ('Waiter phone · Take order.png', 780, 1688, 'Phone', 'dark'),
    'D6': ('Phone · First login, site in preview.png', 780, 1688, 'Phone', 'light'),
    'D7': ('Operator console · phone.png', 780, 1688, 'Phone', 'dark'),
    'D8': ('Customer dashboard · phone.png', 780, 1688, 'Phone', 'light'),
    # Component Kit (1 screen)
    'P1': ('Pop-ups, warnings & utilities@2x.png', 2880, 2480, 'Component Kit', 'light'),
}

def verify_png(filepath, exp_w, exp_h):
    with open(filepath, 'rb') as f:
        sig = f.read(8)
        if sig != b'\x89PNG\r\n\x1a\n':
            return False, 'Invalid PNG signature'
        
        idat_chunks = []
        w, h, bit_depth, color_type = None, None, None, None
        chunks_checked = 0
        
        while True:
            chunk_len_b = f.read(4)
            if not chunk_len_b or len(chunk_len_b) < 4:
                break
            chunk_len = struct.unpack('>I', chunk_len_b)[0]
            chunk_type = f.read(4)
            chunk_data = f.read(chunk_len)
            crc_bytes = f.read(4)
            if len(crc_bytes) < 4:
                return False, 'Truncated chunk CRC'
            
            # 1. Strict CRC32 validation of every chunk
            expected_crc = struct.unpack('>I', crc_bytes)[0]
            calculated_crc = zlib.crc32(chunk_type + chunk_data) & 0xffffffff
            if expected_crc != calculated_crc:
                return False, f'CRC mismatch in {chunk_type.decode(errors="replace")}: expected {hex(expected_crc)}, got {hex(calculated_crc)}'
            chunks_checked += 1
            
            if chunk_type == b'IHDR':
                w, h, bit_depth, color_type, comp, filt, inter = struct.unpack('>IIBBBBB', chunk_data)
            elif chunk_type == b'IDAT':
                idat_chunks.append(chunk_data)
            elif chunk_type == b'IEND':
                break
        
        # 2. Assert dimensions match expectation
        if (w, h) != (exp_w, exp_h):
            return False, f'Dimension mismatch: expected {exp_w}x{exp_h}, got {w}x{h}'
        
        # 3. Assert exact 8-bit RGBA (bit depth 8, color type 6)
        if bit_depth != 8:
            return False, f'Bit depth mismatch: expected 8-bit, got {bit_depth}-bit'
        if color_type != 6:
            return False, f'Color type mismatch: expected 6 (RGBA), got {color_type}'
        
        if not idat_chunks:
            return False, 'No IDAT image data found'
        
        # 4. Decompress IDAT bitstream and assert exact scanline buffer length
        try:
            decompressed = zlib.decompress(b''.join(idat_chunks))
            bytes_per_pixel = 4  # RGBA
            stride = 1 + w * bytes_per_pixel  # 1 filter byte + W * 4 bytes per scanline
            exact_expected = h * stride
            
            if len(decompressed) != exact_expected:
                return False, f'Exact scanline buffer mismatch: expected {exact_expected} bytes, got {len(decompressed)}'
            
            # 5. Validate individual PNG scanline filter bytes (must be in 0..4)
            for y in range(h):
                filter_byte = decompressed[y * stride]
                if filter_byte not in (0, 1, 2, 3, 4):
                    return False, f'Corrupt filter byte {filter_byte} at scanline {y}'
            
            return True, f'Decoded {len(decompressed):,} bytes ({bit_depth}-bit RGBA, {chunks_checked} chunks validated, {h} scanlines verified)'
        except Exception as e:
            return False, f'Decompression/verification error: {e}'

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(root, 'OrbitoX — new look concept-png')
    
    if not os.path.exists(assets_dir):
        print(f'ERROR: Asset directory not found: {assets_dir}')
        sys.exit(1)
        
    print(f'Verifying all 44 concept assets in: {assets_dir}\n')
    passed = 0
    
    for sid, (fname, exp_w, exp_h, dev, mood) in sorted(EXPECTED_SCREENS.items()):
        fpath = os.path.join(assets_dir, fname)
        if not os.path.exists(fpath):
            print(f'FAIL [{sid:4}] {fname:46} -> File missing!')
            continue
            
        ok, msg = verify_png(fpath, exp_w, exp_h)
        if ok:
            passed += 1
            print(f'PASS [{sid:4}] {fname:46} | {exp_w}x{exp_h} | {msg}')
        else:
            print(f'FAIL [{sid:4}] {fname:46} -> {msg}')
            
    print(f'\nResult: {passed}/44 assets successfully decoded and verified.')
    if passed != 44:
        sys.exit(1)

if __name__ == '__main__':
    main()
