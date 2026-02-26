using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using BepInEx;
using UnityEngine;

namespace RaldisCrackhouseV2ModMenu;

[BepInPlugin("fi.ultra.raldiscrackhousev2.modmenu", "Raldi's Crackhouse V2 Mod Menu", "2.1.0")]
public class Plugin : BaseUnityPlugin
{
    private bool _showMenu = true;
    private bool _godMode;
    private bool _noClip;
    private bool _infiniteStamina;
    private bool _infiniteItems;

    private Rect _windowRect = new Rect(20f, 20f, 420f, 520f);
    private Vector2 _scrollPos;
    private float _playerSpeed = 8f;

    private GameObject _player;
    private CharacterController _characterController;

    private readonly List<UnityEngine.Object> _items = new List<UnityEngine.Object>();
    private int _selectedItem = -1;
    private float _nextRescan;

    private void Start()
    {
        Logger.LogInfo("Loaded single-DLL mod menu for Raldi's Crackhouse V2");
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.F1))
        {
            _showMenu = !_showMenu;
        }

        if (_player == null)
        {
            _player = GameObject.FindWithTag("Player");
            if (_player != null)
            {
                _characterController = _player.GetComponent<CharacterController>();
            }
        }

        if (_characterController != null)
        {
            _characterController.detectCollisions = !_noClip;
        }

        if (_player != null)
        {
            SetFloatOnPlayer(new[] { "speed", "moveSpeed", "walkSpeed", "runSpeed" }, _playerSpeed);
        }

        if (_godMode)
        {
            SetFloatOnPlayer(new[] { "hp", "health", "currentHealth" }, 100f, true);
        }

        if (_infiniteStamina)
        {
            SetFloatOnPlayer(new[] { "stamina", "currentStamina", "energy" }, 999f);
        }

        if (_infiniteItems)
        {
            ForceInfiniteItems();
        }

        if (Time.unscaledTime >= _nextRescan)
        {
            ScanItems();
            _nextRescan = Time.unscaledTime + 4f;
        }
    }

    private void OnGUI()
    {
        if (!_showMenu)
        {
            return;
        }

        _windowRect = GUI.Window(7531, _windowRect, DrawWindow, "Raldi v2 Mod Menu (DLL)");
    }

    private void DrawWindow(int id)
    {
        GUILayout.BeginVertical();
        GUILayout.Label("F1 = Avaa / Sulje");

        _godMode = GUILayout.Toggle(_godMode, "God Mode");
        _noClip = GUILayout.Toggle(_noClip, "NoClip");
        _infiniteStamina = GUILayout.Toggle(_infiniteStamina, "Infinite Stamina");
        _infiniteItems = GUILayout.Toggle(_infiniteItems, "Infinite Items");

        GUILayout.Space(8f);
        GUILayout.Label(string.Format("Player speed: {0:0.0}", _playerSpeed));
        _playerSpeed = GUILayout.HorizontalSlider(_playerSpeed, 2f, 24f);

        GUILayout.Space(8f);
        if (GUILayout.Button("Refill HP + Stamina"))
        {
            SetFloatOnPlayer(new[] { "hp", "health", "currentHealth" }, 100f);
            SetFloatOnPlayer(new[] { "stamina", "currentStamina", "energy" }, 999f);
        }

        if (GUILayout.Button("Teleport Spawn"))
        {
            TeleportSpawn();
        }

        GUILayout.Space(10f);
        GUILayout.Label("Items (valitse yksi ja spawn)");

        _scrollPos = GUILayout.BeginScrollView(_scrollPos, GUILayout.Height(220f));
        for (var i = 0; i < _items.Count; i++)
        {
            var label = string.Format("{0}. {1}", i + 1, _items[i].name);
            var selected = _selectedItem == i;
            if (GUILayout.Toggle(selected, label, "Button"))
            {
                _selectedItem = i;
            }
        }
        GUILayout.EndScrollView();

        if (GUILayout.Button("Päivitä item-lista"))
        {
            ScanItems(true);
        }

        if (_selectedItem >= 0 && _selectedItem < _items.Count && GUILayout.Button("Spawn valittu item"))
        {
            SpawnItem(_items[_selectedItem]);
        }

        if (GUILayout.Button("Spawn kaikki itemit"))
        {
            for (var i = 0; i < _items.Count; i++)
            {
                SpawnItem(_items[i]);
            }
        }

        GUILayout.EndVertical();
        GUI.DragWindow(new Rect(0f, 0f, 10000f, 24f));
    }

    private void ScanItems(bool fullReset = false)
    {
        if (fullReset)
        {
            _items.Clear();
            _selectedItem = -1;
        }

        var known = new HashSet<int>();
        for (var i = 0; i < _items.Count; i++)
        {
            known.Add(_items[i].GetInstanceID());
        }

        var gos = Resources.FindObjectsOfTypeAll<GameObject>();
        foreach (var go in gos)
        {
            if (go == null)
            {
                continue;
            }

            var n = go.name.ToLowerInvariant();
            if (!n.Contains("item") && !n.Contains("pickup") && !n.Contains("tool") && !n.Contains("key"))
            {
                continue;
            }

            var id = go.GetInstanceID();
            if (!known.Contains(id))
            {
                _items.Add(go);
                known.Add(id);
            }
        }

        _items.Sort((a, b) => string.Compare(a.name, b.name, StringComparison.OrdinalIgnoreCase));
    }

    private void SpawnItem(UnityEngine.Object obj)
    {
        if (obj == null)
        {
            return;
        }

        if (_player == null)
        {
            return;
        }

        var go = obj as GameObject;
        if (go != null)
        {
            var pos = _player.transform.position + _player.transform.forward * 1.5f + Vector3.up * 0.5f;
            Instantiate(go, pos, Quaternion.identity);
            return;
        }

        TryAddToInventory(obj);
    }

    private void TryAddToInventory(UnityEngine.Object item)
    {
        if (_player == null)
        {
            return;
        }

        foreach (var comp in _player.GetComponents<MonoBehaviour>())
        {
            var methods = comp.GetType().GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            foreach (var method in methods)
            {
                var lower = method.Name.ToLowerInvariant();
                if (!lower.Contains("add") || !lower.Contains("item"))
                {
                    continue;
                }

                var p = method.GetParameters();
                if (p.Length == 1 && p[0].ParameterType.IsInstanceOfType(item))
                {
                    method.Invoke(comp, new object[] { item });
                    return;
                }

                if (p.Length == 2 && p[0].ParameterType.IsInstanceOfType(item) && p[1].ParameterType == typeof(int))
                {
                    method.Invoke(comp, new object[] { item, 1 });
                    return;
                }
            }
        }
    }

    private void ForceInfiniteItems()
    {
        if (_player == null)
        {
            return;
        }

        foreach (var comp in _player.GetComponents<MonoBehaviour>())
        {
            var fields = comp.GetType().GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            foreach (var field in fields)
            {
                if (field.FieldType == typeof(int))
                {
                    var lower = field.Name.ToLowerInvariant();
                    if (lower.Contains("item") || lower.Contains("ammo") || lower.Contains("count") || lower.Contains("inv"))
                    {
                        var v = (int)field.GetValue(comp);
                        if (v < 99)
                        {
                            field.SetValue(comp, 99);
                        }
                    }
                }

                if (typeof(IDictionary).IsAssignableFrom(field.FieldType))
                {
                    var dict = field.GetValue(comp) as IDictionary;
                    if (dict == null)
                    {
                        continue;
                    }

                    var keys = new List<object>();
                    foreach (DictionaryEntry entry in dict)
                    {
                        keys.Add(entry.Key);
                    }

                    for (var i = 0; i < keys.Count; i++)
                    {
                        if (dict[keys[i]] is int c && c < 99)
                        {
                            dict[keys[i]] = 99;
                        }
                    }
                }
            }
        }
    }

    private void SetFloatOnPlayer(IEnumerable<string> names, float value, bool onlyIfLower = false)
    {
        if (_player == null)
        {
            return;
        }

        foreach (var comp in _player.GetComponents<MonoBehaviour>())
        {
            var t = comp.GetType();
            foreach (var name in names)
            {
                var field = t.GetField(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
                if (field != null && field.FieldType == typeof(float))
                {
                    var current = (float)field.GetValue(comp);
                    if (!onlyIfLower || current < value)
                    {
                        field.SetValue(comp, value);
                    }
                }
            }
        }
    }

    private void TeleportSpawn()
    {
        if (_player == null)
        {
            return;
        }

        var spawn = GameObject.Find("Spawn") ?? GameObject.Find("PlayerSpawn") ?? GameObject.Find("Start") ?? GameObject.Find("SpawnPoint");
        if (spawn != null)
        {
            _player.transform.position = spawn.transform.position + Vector3.up;
        }
    }
}
