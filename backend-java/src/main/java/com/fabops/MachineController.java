package com.fabops;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MachineController {

    @GetMapping("/health")
    public Map<String, String> healthCheck() {
        return Map.of("status", "ok", "service", "FabOps Sentinel Java");
    }

    @GetMapping("/machines")
    public List<Map<String, Object>> getMachines() {
        return List.of(
            Map.of(
                "id", "1",
                "name", "Prusa i3 MK3S",
                "machine_type", "3d_printer",
                "status", "running",
                "device_id", "test_camera_1"
            )
        );
    }
    
    // Add other endpoints as needed to port the Python backend fully.
}
