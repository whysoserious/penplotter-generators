#!/usr/bin/env python3
import re
import sys
import numpy as np
from scipy.spatial import KDTree

def sort_dots(input_path, output_path):
    with open(input_path) as f:
        content = f.read()

    # Extract all dots from path d attribute
    dots = re.findall(r'M([\d.]+) ([\d.]+)L[\d.]+ [\d.]+', content)
    print(f"Kropki: {len(dots)}")

    coords = np.array([(float(x), float(y)) for x, y in dots])

    # Nearest-neighbor sort using KDTree
    visited = np.zeros(len(coords), dtype=bool)
    order = []
    current = 0  # start from first dot
    visited[current] = True
    order.append(current)

    tree = KDTree(coords)

    for i in range(1, len(coords)):
        if i % 5000 == 0:
            print(f"  {i}/{len(coords)}...")
        # Query more neighbors in case some are already visited
        _, indices = tree.query(coords[current], k=min(20, len(coords)))
        next_idx = None
        for idx in indices:
            if not visited[idx]:
                next_idx = idx
                break
        if next_idx is None:
            # Fallback: find globally nearest unvisited
            unvisited = np.where(~visited)[0]
            dists = np.linalg.norm(coords[unvisited] - coords[current], axis=1)
            next_idx = unvisited[np.argmin(dists)]
        visited[next_idx] = True
        order.append(next_idx)
        current = next_idx

    sorted_coords = coords[order]

    # Build sorted path d attribute
    parts = []
    for x, y in sorted_coords:
        parts.append(f"M{x} {y}L{x} {y}")
    new_d = "".join(parts)

    # Replace old path d with new sorted one
    new_content = re.sub(
        r'(<path[^>]+d=")[^"]+(")',
        lambda m: m.group(1) + new_d + m.group(2),
        content
    )

    with open(output_path, 'w') as f:
        f.write(new_content)

    # Stats
    orig_penup = 0
    sorted_penup = 0
    for i in range(1, len(coords)):
        ox, oy = coords[i-1]
        nx, ny = coords[i]
        orig_penup += ((nx-ox)**2 + (ny-oy)**2)**0.5
    for i in range(1, len(sorted_coords)):
        ox, oy = sorted_coords[i-1]
        nx, ny = sorted_coords[i]
        sorted_penup += ((nx-ox)**2 + (ny-oy)**2)**0.5

    print(f"\nPen-up travel:")
    print(f"  Oryginał:    {orig_penup:.1f} mm")
    print(f"  Posortowany: {sorted_penup:.1f} mm")
    print(f"  Redukcja:    {100*(1 - sorted_penup/orig_penup):.1f}%")
    print(f"\nZapisano: {output_path}")

if __name__ == "__main__":
    inp = sys.argv[1] if len(sys.argv) > 1 else "/home/bonov/dithering-dots B5-portrait 2026-04-26 14.40.58.svg"
    out = sys.argv[2] if len(sys.argv) > 2 else inp.replace(".svg", "-sorted.svg")
    sort_dots(inp, out)
