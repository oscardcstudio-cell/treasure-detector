import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { ZonesLayer } from '../ZonesLayer';
import * as sourceModule from '../source';
import { mockZonesGeoJSON } from './fixtures';

/**
 * Tests pour le composant ZonesLayer
 * Mocking partiel : MapLibre GL core methods
 */

describe('ZonesLayer', () => {
  let mockMap: Partial<MapLibreMap>;

  beforeEach(() => {
    // Mock minimal de MapLibre Map
    mockMap = {
      isStyleLoaded: vi.fn(() => true),
      getSource: vi.fn(() => null),
      addSource: vi.fn(),
      getLayer: vi.fn(() => null),
      addLayer: vi.fn(),
      setLayoutProperty: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getCanvas: () => ({
        style: { cursor: '' },
      }),
    } as any;

    // Mock loadSignaledZones
    vi.spyOn(sourceModule, 'loadSignaledZones').mockResolvedValue(mockZonesGeoJSON);
  });

  it('devrait charger les zones et afficher le compte', async () => {
    render(<ZonesLayer map={mockMap as MapLibreMap} />);

    await waitFor(() => {
      expect(screen.getByTestId('zones-loaded')).toBeInTheDocument();
    });

    expect(screen.getByText(/3 zone\(s\) chargée\(s\)/)).toBeInTheDocument();
  });

  it('devrait ajouter la source GeoJSON', async () => {
    render(<ZonesLayer map={mockMap as MapLibreMap} />);

    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalledWith(
        'zones-signalees',
        expect.objectContaining({
          type: 'geojson',
          data: mockZonesGeoJSON,
        }),
      );
    });
  });

  it('devrait ajouter les couches de rendu', async () => {
    render(<ZonesLayer map={mockMap as MapLibreMap} />);

    await waitFor(() => {
      expect(mockMap.addLayer).toHaveBeenCalledTimes(2);
    });

    const fillCall = (mockMap.addLayer as any).mock.calls.find(
      (call: any) => call[0].id === 'zones-signalees-fill',
    );
    const outlineCall = (mockMap.addLayer as any).mock.calls.find(
      (call: any) => call[0].id === 'zones-signalees-outline',
    );

    expect(fillCall).toBeDefined();
    expect(outlineCall).toBeDefined();
    expect(fillCall[0].type).toBe('fill');
    expect(outlineCall[0].type).toBe('line');
  });

  it('devrait gérer l\'absence du fichier gracieusement', async () => {
    vi.spyOn(sourceModule, 'loadSignaledZones').mockResolvedValue({
      type: 'FeatureCollection',
      features: [],
    });

    render(<ZonesLayer map={mockMap as MapLibreMap} />);

    await waitFor(() => {
      expect(screen.getByText(/0 zone\(s\) chargée\(s\)/)).toBeInTheDocument();
    });
  });

  it('devrait afficher une erreur en cas de charge échouée', async () => {
    vi.spyOn(sourceModule, 'loadSignaledZones').mockRejectedValue(
      new Error('Erreur test'),
    );

    render(<ZonesLayer map={mockMap as MapLibreMap} />);

    await waitFor(() => {
      expect(screen.getByTestId('zones-error')).toBeInTheDocument();
    });
  });

  it('devrait respecter la prop isVisible', async () => {
    // L'effet de visibilité ne touche que les couches existantes :
    // getLayer doit renvoyer une couche pour que setLayoutProperty soit appelé
    (mockMap.getLayer as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'zones-signalees-fill' });

    const { rerender } = render(<ZonesLayer map={mockMap as MapLibreMap} isVisible={true} />);

    await waitFor(() => {
      expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
        'zones-signalees-fill',
        'visibility',
        'visible',
      );
    });

    rerender(<ZonesLayer map={mockMap as MapLibreMap} isVisible={false} />);

    expect(mockMap.setLayoutProperty).toHaveBeenCalledWith(
      'zones-signalees-fill',
      'visibility',
      'none',
    );
  });

  it('devrait ne rien faire si map est null', () => {
    const { container } = render(<ZonesLayer map={null} />);

    expect(container).toBeTruthy();
    expect(mockMap.addSource).not.toHaveBeenCalled();
  });
});
