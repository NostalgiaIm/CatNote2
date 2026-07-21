"""Embed a Windows ICO file into an EXE resource table.

This replaces the default Electron executable icon without requiring rcedit.
It is a build-time helper and is not used by the app at runtime.
"""
import ctypes
import struct
import sys
from pathlib import Path


RT_ICON = 3
RT_GROUP_ICON = 14
LANG_NEUTRAL = 0


def fail(message):
    raise RuntimeError(message)


def read_ico(icon_path):
    data = Path(icon_path).read_bytes()
    if len(data) < 6:
        fail("ICO file is too small")

    reserved, icon_type, count = struct.unpack_from("<HHH", data, 0)
    if reserved != 0 or icon_type != 1 or count <= 0:
        fail("Invalid ICO header")

    entries = []
    offset = 6
    for index in range(count):
        if offset + 16 > len(data):
            fail("ICO directory is truncated")

        width, height, colors, reserved_byte, planes, bit_count, bytes_in_res, image_offset = struct.unpack_from(
            "<BBBBHHII", data, offset
        )
        if reserved_byte != 0:
            fail("Invalid ICO entry")
        if image_offset + bytes_in_res > len(data):
            fail("ICO image data is truncated")

        entries.append(
            {
                "width": width,
                "height": height,
                "colors": colors,
                "planes": planes,
                "bit_count": bit_count,
                "bytes_in_res": bytes_in_res,
                "image": data[image_offset : image_offset + bytes_in_res],
                "resource_id": index + 1,
            }
        )
        offset += 16

    return entries


def make_group_icon(entries):
    group = bytearray()
    group += struct.pack("<HHH", 0, 1, len(entries))
    for entry in entries:
        group += struct.pack(
            "<BBBBHHIH",
            entry["width"],
            entry["height"],
            entry["colors"],
            0,
            entry["planes"],
            entry["bit_count"],
            entry["bytes_in_res"],
            entry["resource_id"],
        )
    return bytes(group)


def update_resource(exe_path, resource_type, resource_name, payload):
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    begin_update_resource = kernel32.BeginUpdateResourceW
    begin_update_resource.argtypes = [ctypes.c_wchar_p, ctypes.c_bool]
    begin_update_resource.restype = ctypes.c_void_p

    update_resource_w = kernel32.UpdateResourceW
    update_resource_w.argtypes = [
        ctypes.c_void_p,
        ctypes.c_void_p,
        ctypes.c_void_p,
        ctypes.c_ushort,
        ctypes.c_void_p,
        ctypes.c_uint,
    ]
    update_resource_w.restype = ctypes.c_bool

    end_update_resource = kernel32.EndUpdateResourceW
    end_update_resource.argtypes = [ctypes.c_void_p, ctypes.c_bool]
    end_update_resource.restype = ctypes.c_bool

    handle = begin_update_resource(str(exe_path), False)
    if not handle:
        error = ctypes.get_last_error()
        fail(f"BeginUpdateResourceW failed with error {error}")

    try:
        for res_type, res_name, data in payload:
            buffer = (ctypes.c_ubyte * len(data)).from_buffer_copy(data)
            ok = update_resource_w(
                handle,
                ctypes.c_void_p(res_type),
                ctypes.c_void_p(res_name),
                LANG_NEUTRAL,
                ctypes.cast(buffer, ctypes.c_void_p),
                len(data),
            )
            if not ok:
                error = ctypes.get_last_error()
                fail(f"UpdateResourceW failed with error {error}")

        if not end_update_resource(handle, False):
            error = ctypes.get_last_error()
            fail(f"EndUpdateResourceW failed with error {error}")
    except Exception:
        end_update_resource(handle, True)
        raise


def main():
    if len(sys.argv) != 3:
        fail("Usage: apply-exe-icon.py <exe-path> <ico-path>")

    exe_path = Path(sys.argv[1]).resolve()
    icon_path = Path(sys.argv[2]).resolve()
    if not exe_path.exists():
        fail(f"EXE not found: {exe_path}")
    if not icon_path.exists():
        fail(f"ICO not found: {icon_path}")

    entries = read_ico(icon_path)
    payload = []
    for entry in entries:
        payload.append((RT_ICON, entry["resource_id"], entry["image"]))
    payload.append((RT_GROUP_ICON, 1, make_group_icon(entries)))

    update_resource(exe_path, RT_GROUP_ICON, 1, payload)
    print(f"Embedded icon {icon_path} into {exe_path}")


if __name__ == "__main__":
    main()
